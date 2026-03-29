from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import traceback


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures all errors are returned as JSON.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # Handle unexpected exceptions (500 errors)
    error_data = {
        "detail": str(exc),
        "error_type": exc.__class__.__name__,
    }

    return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
