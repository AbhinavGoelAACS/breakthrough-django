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

            # Start the in-process reviewer-reminder scheduler (no cron needed).
            try:
                from api.services.reminder_scheduler import start_reminder_scheduler
                start_reminder_scheduler()
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Failed to start reminder scheduler")
