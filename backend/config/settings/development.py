"""
Kenya Court Case Tracker — Development Settings
Extends base settings with dev-friendly overrides.
"""
from .base import *

DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Use console email backend (prints to terminal instead of sending)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Django Debug Toolbar / Extensions (optional — install if needed)
# INSTALLED_APPS += ["django_extensions"]

# Verbose SQL logging in development
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {module}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",  # Set to DEBUG to see all SQL queries
            "propagate": False,
        },
        "court_tracker": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
