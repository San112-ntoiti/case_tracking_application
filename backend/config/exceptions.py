"""
Custom exception handler.
Ensures all API errors return a consistent JSON structure:
  { "error": true, "message": "...", "details": {...} }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "error": True,
            "status_code": response.status_code,
            "message": _extract_message(response.data),
            "details": response.data,
        }
        response.data = error_data

    return response


def _extract_message(data):
    """Pull a human-readable top-level message from DRF error data."""
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        # Return first field error as the headline message
        first_key = next(iter(data))
        first_val = data[first_key]
        if isinstance(first_val, list):
            return f"{first_key}: {first_val[0]}"
        return str(first_val)
    if isinstance(data, list) and data:
        return str(data[0])
    return "An error occurred."
