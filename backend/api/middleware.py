import json
import logging

from django.http import JsonResponse

logger = logging.getLogger(__name__)

DB_ERROR_MESSAGE = "Service temporarily unavailable. Please try again later."
INTERNAL_ERROR_MESSAGE = "An unexpected error occurred. Please try again later."

_DB_ERROR_CLASSES = (
    'OperationalError', 'InterfaceError', 'DatabaseError',
    'InternalError', 'ProgrammingError', 'DataError',
)


def _is_db_error(exc):
    exc_name = exc.__class__.__name__
    if exc_name in _DB_ERROR_CLASSES:
        return True
    module = getattr(exc.__class__, '__module__', '') or ''
    return 'django.db' in module or 'MySQLdb' in module or 'pymysql' in module


class DatabaseErrorMiddleware:
    """
    Catches database errors that occur outside of DRF views
    (e.g. during authentication middleware) and returns a clean JSON 503.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as exc:
            if _is_db_error(exc):
                logger.error(
                    "Database error during request %s %s: %s",
                    request.method, request.path, str(exc),
                    exc_info=True,
                )
                return JsonResponse(
                    {"detail": DB_ERROR_MESSAGE},
                    status=503,
                )
            # Re-raise non-DB errors so Django's normal error handling applies
            raise
