"""
Accounts Views
All authentication and user management endpoints.
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserProfileSerializer, ChangePasswordSerializer, AdminUserSerializer,
)
from .permissions import IsSystemAdmin

User = get_user_model()


class AuthRateThrottle(AnonRateThrottle):
    """10 attempts per minute on auth endpoints — prevents brute force."""
    rate = "10/minute"
    scope = "auth"


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Public endpoint — no authentication required.
    Returns 201 with user data on success.
    """
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Issue tokens immediately after registration (auto-login)
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Account created successfully.",
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id":        str(user.id),
                "email":     user.email,
                "full_name": user.full_name,
                "role":      user.role,
            },
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Returns JWT access + refresh tokens.
    Records the client IP address on the user record for audit purposes.
    """
    serializer_class   = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Record IP for audit trail
        user = User.objects.get(email=request.data["email"])
        ip = self._get_client_ip(request)
        User.objects.filter(pk=user.pk).update(last_login_ip=ip)

        return Response(data, status=status.HTTP_200_OK)

    @staticmethod
    def _get_client_ip(request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token, invalidating the session.
    The access token expires naturally after 15 minutes.
    """
    serializer_class   = None
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"error": True, "message": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/auth/profile/  — Retrieve own profile
    PATCH /api/v1/auth/profile/ — Update notification prefs, phone, name
    """
    serializer_class   = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/"""
    serializer_class   = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"message": "Password changed successfully."})


class AdminUserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/admin/users/
    System Administrator only — lists all users with filtering.
    """
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSystemAdmin]
    queryset           = User.objects.all().order_by("-created_at")
    filterset_fields   = ["role", "is_active"]
    search_fields      = ["email", "full_name", "phone"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/auth/admin/users/{id}/
    PATCH /api/v1/auth/admin/users/{id}/  — change role or deactivate
    """
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSystemAdmin]
    queryset           = User.objects.all()
