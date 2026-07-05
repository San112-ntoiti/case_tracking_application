"""
Accounts Serializers
Handles validation and serialisation for user registration,
login, and profile management.
"""
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Registration serializer.
    Validates:
    - Unique email and phone
    - Password strength (via Django's built-in validators)
    - Password confirmation match
    """
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ["email", "full_name", "phone", "password", "confirm_password"]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        # create_user handles password hashing — never store plaintext
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """
    Login serializer.
    Returns JWT access + refresh tokens alongside user profile data.
    The frontend stores these and injects the access token as a
    Bearer header on every subsequent request.
    """
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        refresh = RefreshToken.for_user(user)
        return {
            "access":    str(refresh.access_token),
            "refresh":   str(refresh),
            "user": {
                "id":        str(user.id),
                "email":     user.email,
                "full_name": user.full_name,
                "role":      user.role,
                "phone":     user.phone,
                "has_premium": user.has_active_subscription(),
            },
        }


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read/update user profile.
    Password is excluded — handled via a dedicated change-password endpoint.
    has_premium is a computed field: True if active subscription exists.
    """
    has_premium = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "phone", "role",
            "notify_email", "notify_sms", "notify_whatsapp",
            "email_verified", "created_at", "has_premium",
        ]
        read_only_fields = ["id", "email", "role", "email_verified", "created_at"]

    def get_has_premium(self, obj) -> bool:
        return obj.has_active_subscription()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """Full user detail for System Administrator views."""
    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "phone", "role",
            "is_active", "email_verified", "created_at", "last_login_ip",
        ]
        read_only_fields = ["id", "email", "created_at", "last_login_ip"]
