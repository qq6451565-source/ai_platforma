from django.db import models

from accounts.models import User
from directions.models import Direction
from university.models import Faculty


class RegistrationWindow(models.Model):
    direction = models.ForeignKey(Direction, on_delete=models.CASCADE, null=True, blank=True)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        name = self.direction.name if self.direction else "No direction"
        return f"{name} ({self.start_at.date()})"


class Applicant(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
        ("approved", "Approved"),
    )

    full_name = models.CharField(max_length=255)
    passport_id = models.CharField(max_length=20)
    birth_date = models.DateField()
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

    def __str__(self):
        return self.full_name


class ApplicantDocument(models.Model):
    applicant = models.OneToOneField(Applicant, on_delete=models.CASCADE, related_name="documents")
    passport_front = models.ImageField(upload_to="applicants/passport/")
    passport_back = models.ImageField(upload_to="applicants/passport/")
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
