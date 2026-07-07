"""
Run the reviewer-reminder cycle.

This is the primary entry point for automated reminders in production: run it
from a cron job (hourly is fine — sends are throttled per-record). Do NOT run
reminders from an in-process server thread on shared hosting; see
api/services/reminder_scheduler.py for why.

    python manage.py send_review_reminders --dry-run   # show what would be sent
    python manage.py send_review_reminders             # send now (synchronously)
"""

from django.core.management.base import BaseCommand

from api.services.reminders import run_reminder_cycle


class Command(BaseCommand):
    help = "Send reminder emails for pending reviewer invitations and overdue reviews."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be sent without sending emails or writing to the DB.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no emails will be sent, no records updated.\n"))

        # Manual runs send synchronously so the operator sees a real result.
        summary = run_reminder_cycle(dry_run=dry_run, async_send=False, log=self.stdout.write)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Invitation reminders: {summary['invitation_reminders']}, "
            f"invitations expired: {summary['invitations_expired']}, "
            f"review reminders: {summary['review_reminders']}."
        ))
