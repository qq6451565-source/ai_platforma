from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    phone = models.CharField(max_length=20, null=True, blank=True)
    face_image = models.ImageField(upload_to="faces/", null=True, blank=True)
    face_embedding = models.JSONField(
        null=True, 
        blank=True,
        help_text="Face embedding vector for verification"
    )
    token_version = models.PositiveIntegerField(default=1)

    # Student qaysi guruhda o'qishi
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )

    REQUIRED_FIELDS = ["email"]

    class Meta:
        permissions = [
            ("can_export_grades", "Can export grades"),
            ("can_approve_enrollment", "Can approve enrollment"),
            ("can_manage_schedule", "Can manage schedule"),
            ("can_view_reports", "Can view reports"),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class PassportData(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="passport")
    passport_series = models.CharField(max_length=10)
    passport_number = models.CharField(max_length=10)
    card_number = models.CharField(max_length=20, null=True, blank=True)
    personal_number = models.CharField(max_length=20, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    extracted_fullname = models.CharField(max_length=150, null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    patronymic = models.CharField(max_length=100, null=True, blank=True)
    sex = models.CharField(max_length=20, null=True, blank=True)
    citizenship = models.CharField(max_length=50, null=True, blank=True)
    birth_place = models.CharField(max_length=255, null=True, blank=True)
    front_image = models.ImageField(upload_to="passport/")
    back_image = models.ImageField(upload_to="passport/")
    selfie_image = models.ImageField(upload_to="passport/selfie/", null=True, blank=True)

    def __str__(self):
        return f"Passport {self.user.username}"


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ("login_success", "Login success"),
        ("login_failed", "Login failed"),
        ("logout", "Logout"),
        ("role_changed", "Role changed"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    role = models.CharField(max_length=20, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    extra = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.user.username if self.user else "anonymous"
        return f"{self.action} - {name}"
