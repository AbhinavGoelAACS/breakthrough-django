import os
import sys

from django.apps import AppConfig


def _log_startup(message):
    """Append to stderr.log next to passenger_wsgi.py.

    cPanel gives no console, so this file is the only way to see what happened
    during a deploy.
    """
    try:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(base, "stderr.log"), "a", encoding="utf-8") as handle:
            handle.write(f"[startup] {message}\n")
    except Exception:
        pass


def _apply_pending_migrations():
    """Apply unapplied migrations on server start.

    There is no SSH access on this cPanel account, so `manage.py migrate`
    cannot be run by hand or from the deploy workflow. Code arrives over FTP
    and Passenger reloads via tmp/restart.txt — this hook is therefore the only
    place migrations can run.

    Three constraints shape the implementation:
      * Passenger spawns several workers, so a file lock keeps exactly one of
        them migrating; the rest skip immediately rather than queueing.
      * Shared hosting has tight process limits (see the note in ready()), so
        the common "nothing to do" path must cost one cheap query and no lock.
      * A failure must not take the site down. It is logged and the worker
        carries on serving; the previously-working endpoints keep working.
    """
    from django.db import connections, DEFAULT_DB_ALIAS
    from django.db.migrations.executor import MigrationExecutor

    connection = connections[DEFAULT_DB_ALIAS]

    # Cheap check first — one read of django_migrations on every boot.
    try:
        executor = MigrationExecutor(connection)
        targets = executor.loader.graph.leaf_nodes()
        plan = executor.migration_plan(targets)
    except Exception as exc:
        _log_startup(f"could not read migration state: {exc}")
        return

    if not plan:
        return

    pending = ", ".join(f"{m.app_label}.{m.name}" for m, _ in plan)

    lock_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tmp", "migrate.lock"
    )
    try:
        os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    except Exception:
        pass

    try:
        import fcntl
    except ImportError:        # non-POSIX; no concurrent workers to guard against
        fcntl = None

    lock_handle = None
    try:
        if fcntl is not None:
            lock_handle = open(lock_path, "w")
            try:
                fcntl.flock(lock_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                # Another worker is already migrating. Skipping is correct:
                # whichever worker holds the lock will finish the job.
                lock_handle.close()
                return

        from django.core.management import call_command

        _log_startup(f"applying migrations: {pending}")
        call_command("migrate", "--no-input", verbosity=0)
        _log_startup("migrations applied")
    except Exception as exc:
        # Deliberately swallowed: a migration failure must not stop the worker
        # from booting, or every endpoint goes down instead of just the new one.
        _log_startup(f"MIGRATION FAILED: {exc}")
    finally:
        if lock_handle is not None:
            try:
                fcntl.flock(lock_handle, fcntl.LOCK_UN)
                lock_handle.close()
            except Exception:
                pass


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Only on a real server boot — never during migrate/makemigrations/test/shell,
        # which would recurse or fight the command the developer actually ran.
        is_server_boot = 'runserver' in sys.argv or 'passenger_wsgi' in sys.modules
        if not is_server_boot:
            return

        # Order matters: migrations create the tables this project owns, then
        # ensure_schema adds columns to the legacy managed=False tables.
        _apply_pending_migrations()

        from django.core.management import call_command
        try:
            call_command('ensure_schema', verbosity=0)
        except Exception:
            pass

        # NOTE: Reviewer reminders are intentionally NOT run from an in-process
        # thread here. On cPanel/CloudLinux shared hosting each Passenger worker
        # runs under a tight process/thread (LVE nproc) limit, and a permanent
        # background thread + held MySQL connection per worker pushed prod into a
        # boot/kill churn loop (workers SIGTERM'd, respawned, repeat).
        # Run reminders from a cron job instead:
        #     * * (hourly) python manage.py send_review_reminders
        # See DEPLOYMENT.md.
