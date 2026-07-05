"""
Custom Permission Classes
These are reusable across all apps. Rather than checking roles in every
view, we define named permission classes here following the Single
Responsibility Principle.

Usage in views:
    permission_classes = [IsCourtAdmin]
"""
from rest_framework.permissions import BasePermission, IsAuthenticated


class IsCourtAdmin(BasePermission):
    """Allow access only to COURT_ADMIN and SYS_ADMIN roles."""
    message = "You must be a Court Administrator to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_court_admin
        )


class IsSystemAdmin(BasePermission):
    """Allow access only to SYS_ADMIN role."""
    message = "You must be a System Administrator to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_sys_admin
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow access if the user owns the object, or is a system admin."""
    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if request.user.is_sys_admin:
            return True
        # Object must have a 'user' field pointing to the owner
        return hasattr(obj, "user") and obj.user == request.user


class IsPremiumUser(BasePermission):
    """Allow access only to users with an active premium subscription."""
    message = "This feature requires an active premium subscription."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_active_subscription()
        )


class IsOwnerOrReadOnly(BasePermission):
    """Read access for all authenticated users; write access only for object owner."""

    def has_object_permission(self, request, view, obj):
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True
        return hasattr(obj, "user") and obj.user == request.user
