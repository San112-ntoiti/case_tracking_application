"""
Audit Middleware
Attaches the current request to a thread-local so that signal handlers
and service functions can access it without passing it through every function call.
"""
import threading

_request_local = threading.local()


def get_current_request():
    return getattr(_request_local, "request", None)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _request_local.request = request
        response = self.get_response(request)
        return response
