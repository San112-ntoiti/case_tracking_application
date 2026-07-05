"""
Accounts Models
Custom User model extending AbstractBaseUser for full control over
authentication fields. Using AbstractBaseUser (not AbstractUser) so we
can make email the primary identifier instead of username.
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    PUBLIC      = "PUBLIC",       "Public User"
    ADVOCATE    = "ADVOCATE",     "Advocate / Lawyer"
    COURT_ADMIN = "COURT_ADMIN",  "Court Administrator"
    SYS_ADMIN   = "SYS_ADMIN",   "System Administrator"


class UserManager(BaseUserManager):
    """Custom manager: email is the unique identifier, not username."""

    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", UserRole.PUBLIC)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)   # Django bcrypt hashing
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", UserRole.SYS_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Core user model.
    - UUID primary key prevents sequential ID enumeration attacks.
    - Email is the login credential (no username field).
    - Role drives RBAC across all API endpoints.
    - Notification preference flags allow per-channel opt-out.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email           = models.EmailField(unique=True, db_index=True)
    phone           = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name       = models.CharField(max_length=255)
    role            = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.PUBLIC)

    # Account state
    is_active       = models.BooleanField(default=True)
    is_staff        = models.BooleanField(default=False)   # Django admin access
    email_verified  = models.BooleanField(default=False)

    # Notification preferences (per-channel opt-in/out)
    notify_email    = models.BooleanField(default=True)
    notify_sms      = models.BooleanField(default=False)
    notify_whatsapp = models.BooleanField(default=False)

    # Timestamps
    created_at      = models.DateTimeField(default=timezone.now)
    updated_at      = models.DateTimeField(auto_now=True)
    last_login_ip   = models.GenericIPAddressField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table    = "users"
        verbose_name = "User"
        ordering    = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} <{self.email}> [{self.role}]"

    # ── Convenience properties used in permissions and business logic ──────────

    @property
    def is_court_admin(self):
        return self.role in (UserRole.COURT_ADMIN, UserRole.SYS_ADMIN)

    @property
    def is_sys_admin(self):
        return self.role == UserRole.SYS_ADMIN

    def has_active_subscription(self):
        """Returns True if user has at least one ACTIVE subscription right now."""
        from billing.models import Subscription
        return Subscription.objects.filter(
            user=self,
            status=Subscription.Status.ACTIVE,
            ends_at__gt=timezone.now(),
        ).exists()

    def tracked_case_count(self):
        return self.tracked_cases.count()
