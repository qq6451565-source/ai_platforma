from django.db import models

from accounts.models import User
from directions.models import Direction


class RegistrationWindow(models.Model):
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return "Registration open" if self.is_active else "Registration closed"


class Applicant(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
        ("approved", "Approved"),
    )

    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="applicant_profile")
    full_name = models.CharField(max_length=255)
    passport_id = models.CharField(max_length=20, null=True, blank=True)
    card_number = models.CharField(max_length=20, null=True, blank=True)
    personal_number = models.CharField(max_length=20, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    patronymic = models.CharField(max_length=100, null=True, blank=True)
    sex = models.CharField(max_length=20, null=True, blank=True)
    citizenship = models.CharField(max_length=50, null=True, blank=True)
    birth_place = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    direction_choice = models.ForeignKey(Direction, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_applicants",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.full_name


class ApplicantDocument(models.Model):
    applicant = models.OneToOneField(Applicant, on_delete=models.CASCADE, related_name="documents")
    passport_front = models.ImageField(upload_to="applicants/passport/")
    passport_back = models.ImageField(upload_to="applicants/passport/", null=True, blank=True)
    face_image = models.ImageField(upload_to="applicants/face/")

    def __str__(self):
        return f"Docs {self.applicant_id}"


class VerificationResult(models.Model):
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name="verifications")
    verified = models.BooleanField(default=False)
    confidence = models.FloatField(default=0.0)
    events_json = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Verify {self.applicant_id}"
