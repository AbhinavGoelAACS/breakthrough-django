"""
In-process scheduler for automated reviewer reminders.

A single daemon thread wakes up on an interval and runs the reminder cycle — no
external cron or job runner required. Startup is triggered from
``ApiConfig.ready()`` when the app is served (runserver / Passenger).

Multiple server workers each start their own thread, so a MySQL advisory lock
(``GET_LOCK``) ensures only one worker actually runs a given cycle. The
per-record throttling in ``reminders`` is the real duplicate-guard; the lock just
avoids redundant scans and races.
"""

import logging
import threading
import time

from django.db import connection, close_old_connections

logger = logging.getLogger(__name__)

# How often to scan for due reminders. Throttling in reminders.py means a short
# interval never produces duplicate emails; hourly keeps reminders timely.
CHECK_INTERVAL_SECONDS = 3600
# Delay the first scan so the app finishes booting first.
INITIAL_DELAY_SECONDS = 60
# MySQL named lock shared across all server workers.
_LOCK_NAME = "bt_review_reminders"

_started = False
_start_lock = threading.Lock()


def start_reminder_scheduler():
    """Start the background scheduler thread exactly once per process."""
    global _started
    with _start_lock:
        if _started:
            return
        _started = True
        thread = threading.Thread(
            target=_run_loop, name="review-reminder-scheduler", daemon=True
        )
        thread.start()
        logger.info("Review reminder scheduler started (interval=%ss)", CHECK_INTERVAL_SECONDS)


def _run_loop():
    time.sleep(INITIAL_DELAY_SECONDS)
    while True:
        try:
            _run_once_guarded()
        except Exception:
            logger.exception("Review reminder cycle failed")
        time.sleep(CHECK_INTERVAL_SECONDS)


def _run_once_guarded():
    # This is a long-lived thread; drop any stale/expired DB connection first.
    close_old_connections()

    with connection.cursor() as cursor:
        cursor.execute("SELECT GET_LOCK(%s, 0)", [_LOCK_NAME])
        got_lock = cursor.fetchone()[0]

    if not got_lock:
        logger.debug("Another worker holds the reminder lock; skipping this cycle")
        return

    try:
        from api.services.reminders import run_reminder_cycle
        summary = run_reminder_cycle(dry_run=False, async_send=True, log=logger.info)
        if summary.get("invitation_reminders") or summary.get("review_reminders") or summary.get("invitations_expired"):
            logger.info("Review reminder cycle: %s", summary)
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SELECT RELEASE_LOCK(%s)", [_LOCK_NAME])
