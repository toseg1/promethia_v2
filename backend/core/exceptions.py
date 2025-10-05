from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.http import Http404
from .utils import APIResponse


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    """
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, ValidationError):
            return Response(
                APIResponse.error(
                    message="Validation failed",
                    errors=exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
                    status_code=status.HTTP_400_BAD_REQUEST
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        elif isinstance(exc, Http404):
            return Response(
                APIResponse.error(
                    message="Resource not found",
                    status_code=status.HTTP_404_NOT_FOUND
                ),
                status=status.HTTP_404_NOT_FOUND
            )
        
        else:
            return Response(
                APIResponse.error(
                    message=str(exc) if str(exc) else "An error occurred",
                    status_code=response.status_code
                ),
                status=response.status_code
            )

    return response