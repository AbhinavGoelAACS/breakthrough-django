"""
Core logic for automated reviewer reminders.

The entry point is the ``send_review_reminders`` management command, run from
cron in production (hourly). Not run from an in-process server thread — see
api/services/reminder_scheduler.py for why.

Two cases are handled:

1. Pending invitations — a reviewer was invited but has neither accepted nor
   declined. We nudge once after a few days, then a final reminder shortly before
   the invitation expires. Invitations past their token expiry are marked
   ``expired`` and skipped.

2. Accepted-but-incomplete reviews — a reviewer accepted (an OnlineReview row was
   created) but has not submitted their review. We nudge once as the due date
   approaches, then periodically once it is overdue.

Emails are dispatched through the same fire-and-forget background queue used for
reviewer invitations (``queue_email_task``). The ``reminder_count`` /
``last_reminder_at`` columns throttle sending so the cycle is safe to run
frequently.
"""

import logging
from datetime import timedelta

from django.utils import timezone

from api.models import (
    ReviewerInvitation,
    OnlineReview,
    Paper,
    Journal,
    User,
)
from api.services.email_service import (
    send_reviewer_invitation_reminder,
    send_review_due_reminder,
    queue_email_task,
)

logger = logging.getLogger(__name__)

# --- Cadence configuration --------------------------------------------------
# Pending invitations
INVITE_FIRST_REMINDER_DAYS = 3        # first nudge this many days after inviting
INVITE_FINAL_REMINDER_HOURS = 24      # final nudge within this window before expiry
INVITE_MAX_REMINDERS = 2

# Accepted reviews
REVIEW_DUE_SOON_DAYS = 3              # nudge when the due date is within this window
REVIEW_OVERDUE_INTERVAL_DAYS = 3     # re-nudge overdue reviews at most this often
REVIEW_MAX_REMINDERS = 4             # 1 pre-due + up to 3 overdue nudges

# Never send two reminders for the same record within this window, regardless of
# stage — guards against the cycle running multiple times a day.
MIN_HOURS_BETWEEN_REMINDERS = 20


def run_reminder_cycle(dry_run=False, async_send=True, log=None):
    """
    Scan for due reminders and dispatch them.

    :param dry_run: when True, nothing is sent and no records are updated.
    :param async_send: when True, emails go through the background queue
        (fire-and-forget, like reviewer invitations); when False they are sent
        synchronously (useful for manual runs that want a real result).
    :param log: optional callable(str) for progress output; defaults to the logger.
    :returns: summary dict.
    """
    log = log or logger.info
    ctx = _Context(dry_run=dry_run, async_send=async_send, log=log)

    now = timezone.now()
    invite_sent, invite_expired = _process_invitations(ctx, now)
    review_sent = _process_reviews(ctx, now)

    summary = {
        "invitation_reminders": invite_sent,
        "invitations_expired": invite_expired,
        "review_reminders": review_sent,
    }
    return summary


class _Context:
    """Per-run state: config flags, output sink, and lookup caches."""

    def __init__(self, dry_run, async_send, log):
        self.dry_run = dry_run
        self.async_send = async_send
        self.log = log
        self._paper_cache = {}
        self._journal_cache = {}

    def get_paper(self, paper_id):
        if paper_id not in self._paper_cache:
            self._paper_cache[paper_id] = Paper.objects.filter(id=paper_id).first()
        return self._paper_cache[paper_id]

    def journal_name(self, journal_id):
        if journal_id in (None, ""):
            return "BreakThrough Publishers"
        if journal_id not in self._journal_cache:
            journal = Journal.objects.filter(fld_id=journal_id).first()
            self._journal_cache[journal_id] = (
                journal.fld_journal_name if journal else "BreakThrough Publishers"
            )
        return self._journal_cache[journal_id]

    def dispatch(self, send_fn, *args):
        """Send now (sync) or hand off to the background email queue (async)."""
        if self.async_send:
            queue_email_task(send_fn, *args)
            return True
        return bool(send_fn(*args))

    def mark_sent(self, record):
        if self.dry_run:
            return
        record.reminder_count = (record.reminder_count or 0) + 1
        record.last_reminder_at = timezone.now()
        record.save(update_fields=["reminder_count", "last_reminder_at"])


def _recently_reminded(record, now):
    return (
        record.last_reminder_at is not None
        and (now - record.last_reminder_at) < timedelta(hours=MIN_HOURS_BETWEEN_REMINDERS)
    )


# -- pending invitations -----------------------------------------------------
def _process_invitations(ctx, now):
    sent = 0
    expired = 0

    for inv in ReviewerInvitation.objects.filter(status="pending"):
        # Proactively expire invitations whose token has lapsed.
        if inv.token_expiry and inv.token_expiry < now:
            if not ctx.dry_run:
                inv.status = "expired"
                inv.save(update_fields=["status"])
            expired += 1
            continue

        if _recently_reminded(inv, now):
            continue

        count = inv.reminder_count or 0
        if count >= INVITE_MAX_REMINDERS:
            continue

        hours_to_expiry = (
            (inv.token_expiry - now).total_seconds() / 3600 if inv.token_expiry else None
        )
        days_since_invite = (now - inv.invited_on).days if inv.invited_on else None

        is_final = hours_to_expiry is not None and hours_to_expiry <= INVITE_FINAL_REMINDER_HOURS
        first_due = (
            days_since_invite is not None and days_since_invite >= INVITE_FIRST_REMINDER_DAYS
        )

        if not (is_final or (count == 0 and first_due)):
            continue

        paper = ctx.get_paper(inv.paper_id)
        if not paper:
            continue
        journal_name = ctx.journal_name(inv.journal_id)

        label = "FINAL" if is_final else "first"
        ctx.log(
            f"  [invite/{label}] {inv.reviewer_email} — paper {inv.paper_id} "
            f"({paper.paper_code or paper.id})"
        )

        if not ctx.dry_run:
            ok = ctx.dispatch(send_reviewer_invitation_reminder, inv, paper, journal_name, is_final)
            if not ok:
                ctx.log(f"    failed to send to {inv.reviewer_email}")
                continue
            ctx.mark_sent(inv)
        sent += 1

    return sent, expired


# -- accepted-but-incomplete reviews -----------------------------------------
def _process_reviews(ctx, now):
    sent = 0

    reviews = OnlineReview.objects.filter(review_status="pending", submitted_on__isnull=True)
    for review in reviews:
        if not review.due_date:
            continue
        if _recently_reminded(review, now):
            continue

        count = review.reminder_count or 0
        if count >= REVIEW_MAX_REMINDERS:
            continue

        is_overdue = review.due_date < now
        if is_overdue:
            # Re-nudge overdue reviews on a fixed interval.
            if (
                review.last_reminder_at is not None
                and (now - review.last_reminder_at) < timedelta(days=REVIEW_OVERDUE_INTERVAL_DAYS)
            ):
                continue
        else:
            # Not overdue: only nudge once, as the deadline approaches.
            due_soon = (review.due_date - now) <= timedelta(days=REVIEW_DUE_SOON_DAYS)
            if not (count == 0 and due_soon):
                continue

        paper = ctx.get_paper(review.paper_id)
        if not paper:
            continue

        reviewer = None
        if review.reviewer_id:
            try:
                reviewer = User.objects.filter(id=int(review.reviewer_id)).first()
            except (TypeError, ValueError):
                reviewer = None
        if not reviewer or not reviewer.email:
            continue

        reviewer_name = f"{reviewer.fname or ''} {reviewer.lname or ''}".strip() or reviewer.email
        journal_name = ctx.journal_name(paper.journal)

        label = "overdue" if is_overdue else "due-soon"
        ctx.log(
            f"  [review/{label}] {reviewer.email} — paper {review.paper_id} "
            f"({paper.paper_code or paper.id})"
        )

        if not ctx.dry_run:
            ok = ctx.dispatch(
                send_review_due_reminder,
                paper, journal_name, reviewer.email, reviewer_name, review.due_date, is_overdue,
            )
            if not ok:
                ctx.log(f"    failed to send to {reviewer.email}")
                continue
            ctx.mark_sent(review)
        sent += 1

    return sent
