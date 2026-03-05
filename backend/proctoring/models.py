from django.db import models

from accounts.models import User
from assessment.models import ExamAttempt
from student_tests.models import StudentTest


class ProctorSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exam_attempt = models.OneToOneField(
        ExamAttempt,
        on_delete=models.CASCADE,
        related_name="proctor_session",
        null=True,
        blank=True,
    )
    student_test = models.OneToOneField(
        StudentTest,
        on_delete=models.CASCADE,
        related_name="proctor_session",
        null=True,
        blank=True,
    )
    verified = models.BooleanField(default=False)
    confidence = models.FloatField(default=0.0)
    blocked = models.BooleanField(default=False)
    blocked_reason = models.CharField(max_length=255, blank=True, default="")
    missing_since = models.DateTimeField(null=True, blank=True)
    last_present_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Proctoring statistikasi
    total_checks = models.PositiveIntegerField(default=0)
    success_checks = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Session {self.user_id}"

    @property
    def face_verified_ratio(self) -> float:
        """Muvaffaqiyatli yuz tekshiruvi nisbati."""
        if not self.total_checks:
            return 0.0
        return round(self.success_checks / self.total_checks, 4)


class ProctorEvent(models.Model):
    EVENT_CHOICES = (
        ("face_missing", "Face Missing"),
        ("face_returned", "Face Returned"),
        ("multiple_faces", "Multiple Faces"),
    )

    session = models.ForeignKey(ProctorSession, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    meta_json = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.event_type} {self.session_id}"
