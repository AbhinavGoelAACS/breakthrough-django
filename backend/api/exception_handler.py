from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger(__name__)

# Error messages that are safe to expose to clients
DB_ERROR_MESSAGE = "Service temporarily unavailable. Please try again later."
INTERNAL_ERROR_MESSAGE = "An unexpected error occurred. Please try again later."


def _is_db_error(exc):
    """Check if the exception is database-related."""
    db_error_classes = (
        'OperationalError', 'InterfaceError', 'DatabaseError',
        'InternalError', 'ProgrammingError', 'DataError',
    )
    exc_name = exc.__class__.__name__
    if exc_name in db_error_classes:
        return True
    # Also catch Django's db wrappers
    module = getattr(exc.__class__, '__module__', '') or ''
    if 'django.db' in module or 'MySQLdb' in module or 'pymysql' in module:
        return True
    return False


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures all errors are returned as JSON
    without leaking sensitive internal details.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # Log the full error for debugging (server-side only)
    view = context.get('view', None)
    view_name = view.__class__.__name__ if view else 'Unknown'
    logger.error(
        "Unhandled exception in %s: %s",
        view_name, str(exc),
        exc_info=True,
    )

    # Database errors — return 503
    if _is_db_error(exc):
        return Response(
            {"detail": DB_ERROR_MESSAGE},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # All other unhandled errors — return generic 500
    return Response(
        {"detail": INTERNAL_ERROR_MESSAGE},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
