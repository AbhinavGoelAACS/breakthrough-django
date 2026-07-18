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


class ApiJsonErrorMiddleware:
    """
    Ensure API routes always respond with JSON on error.

    Django's ``handler404`` / ``handler500`` already return JSON, but only when
    ``DEBUG=False``. When ``DEBUG=True`` (dev), Django renders an HTML technical
    error page for unmatched URLs / unhandled exceptions instead — useless to an
    API client. This converts any HTML error response on an ``/api/`` path into a
    JSON body, regardless of DEBUG. Non-API paths (server-rendered Scholar/admin
    pages) are left untouched.

    Must be listed *after* CorsMiddleware so CORS headers are re-applied to the
    replaced response.
    """

    _MESSAGES = {
        400: "Bad request.",
        403: "Forbidden.",
        404: "Not found.",
        405: "Method not allowed.",
        500: "Internal server error.",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code < 400 or not request.path.startswith("/api/"):
            return response

        content_type = response.get("Content-Type", "") or ""
        if "text/html" not in content_type:
            # Already JSON (DRF errors, DB-error middleware, etc.) — leave as-is.
            return response

        detail = self._MESSAGES.get(response.status_code, "Request failed.")
        return JsonResponse({"detail": detail}, status=response.status_code)
