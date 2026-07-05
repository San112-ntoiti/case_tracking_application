"""Accounts URL patterns."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView, LoginView, LogoutView,
    ProfileView, ChangePasswordView,
    AdminUserListView, AdminUserDetailView,
)

app_name = "accounts"

urlpatterns = [
    # Public auth
    path("register/",        RegisterView.as_view(),      name="register"),
    path("login/",           LoginView.as_view(),          name="login"),
    path("logout/",          LogoutView.as_view(),         name="logout"),
    path("token/refresh/",   TokenRefreshView.as_view(),   name="token-refresh"),

    # Authenticated user
    path("profile/",         ProfileView.as_view(),        name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # System Admin
    path("admin/users/",           AdminUserListView.as_view(),         name="admin-users"),
    path("admin/users/<uuid:pk>/", AdminUserDetailView.as_view(),       name="admin-user-detail"),
]
