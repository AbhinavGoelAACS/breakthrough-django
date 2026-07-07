from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        import sys
        # Auto-run schema check on server start (not during migrate/test/shell)
        if 'runserver' in sys.argv or 'passenger_wsgi' in sys.modules:
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
