"""
Request-triggered scheduler for automated reviewer reminders — no cron needed.

Why not a background thread
---------------------------
Between 3 and 7 July 2026 this module ran a permanent daemon thread in every
Passenger worker, holding a MySQL connection and a ``GET_LOCK``. On
cPanel/CloudLinux that exceeded the account's LVE process/thread limit: workers
were SIGTERM-killed, respawned, and looped. It was removed in c9bece1. Do not
reintroduce a per-worker scheduler thread here.

Why not cron
------------
The cPanel cron entry is easy to get wrong in a way nothing surfaces — a whole
crontab line pasted into the Command box ran a program called ``0`` hourly for
about two months and sent no reminders at all, with the failure visible only in
a log file nobody reads.

What this does instead
----------------------
``maybe_run_reminder_cycle()`` is called from ReminderTickMiddleware after each
response. It is designed to cost nothing on the overwhelming majority of
requests:

1. A per-process monotonic timer means only one request every
   ``LOCAL_CHECK_SECONDS`` touches the database at all.
2. That request then tries to claim the cycle with a single conditional
   UPDATE. Only the worker whose UPDATE matches a row proceeds, so the cycle
   runs about once per ``CYCLE_INTERVAL_MINUTES`` across the whole site
   regardless of how many workers are running.
3. The claim holder hands the cycle to the existing background email queue.
   That thread already exists in every worker for sending mail, so this adds
   no new thread and holds no connection of its own.

Duplicate emails are impossible even if a cycle ran twice: reminders.py
throttles per record via ``reminder_count`` / ``last_reminder_at``.
"""

import logging
import time
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

# How often the whole site runs a cycle. Sends are throttled per record, so a
# shorter interval only costs a scan.
CYCLE_INTERVAL_MINUTES = 60

# How often a single worker is willing to ask the database whether a cycle is
# due. Every request inside this window returns without any query.
LOCAL_CHECK_SECONDS = 300

# Row id of the single claim marker.
_CLAIM_ROW_ID = 1

# Per-process, per-worker: monotonic seconds at the last database check.
_last_local_check = 0.0


def maybe_run_reminder_cycle():
    """Run the reminder cycle if it is due. Cheap and safe to call per request."""
    global _last_local_check

    now_monotonic = time.monotonic()
    if _last_local_check and (now_monotonic - _last_local_check) < LOCAL_CHECK_SECONDS:
        return False
    _last_local_check = now_monotonic

    try:
        if not _claim_cycle():
            return False
    except Exception:
        # A reminder cycle must never affect the response that triggered it.
        logger.exception("Could not check whether a reminder cycle was due")
        return False

    try:
        from api.services.email_service import queue_email_task
        from api.services.reminders import run_reminder_cycle

        # Handed to the existing email thread so the request returns now. The
        # cycle queues its own emails onto that same queue behind this task.
        queue_email_task(_run_and_log, run_reminder_cycle)
        return True
    except Exception:
        logger.exception("Could not dispatch the reminder cycle")
        return False


def _run_and_log(run_reminder_cycle):
    summary = run_reminder_cycle(dry_run=False, async_send=True, log=logger.info)
    logger.info(
        "Reminder cycle finished: %s invitation reminders, %s expired, %s review reminders",
        summary["invitation_reminders"],
        summary["invitations_expired"],
        summary["review_reminders"],
    )
    return summary


def _claim_cycle():
    """Return True for exactly one caller per CYCLE_INTERVAL_MINUTES.

    The claim is a single conditional UPDATE, so two workers racing cannot both
    win it — one changes the row, the other matches nothing.
    """
    from api.models import ReminderCycleRun

    now = timezone.now()
    cutoff = now - timedelta(minutes=CYCLE_INTERVAL_MINUTES)

    claimed = ReminderCycleRun.objects.filter(
        id=_CLAIM_ROW_ID, last_started_at__lt=cutoff
    ).update(last_started_at=now)
    if claimed:
        return True

    # No row yet: first run on this database. Creating it counts as the claim,
    # and the id is fixed so a race raises IntegrityError for the loser.
    if not ReminderCycleRun.objects.filter(id=_CLAIM_ROW_ID).exists():
        try:
            ReminderCycleRun.objects.create(id=_CLAIM_ROW_ID, last_started_at=now)
            return True
        except Exception:
            return False

    return False
