from django.db import models
from django.utils import timezone
from lessons.models import Lesson
from accounts.models import User


class Attendance(models.Model):
    ATTEND_CHOICES = (
        ("present", "Bor"),
        ("absent", "Yoq"),
    )

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={"role": "student"})
    status = models.CharField(max_length=10, choices=ATTEND_CHOICES, default="absent")
    timestamp = models.DateTimeField(auto_now=True)

    # Yuz tekshiruvi statistikasi (live dars)
    face_check_count = models.PositiveIntegerField(default=0)
    face_success_count = models.PositiveIntegerField(default=0)
    face_verified_ratio = models.FloatField(default=0.0)

    # Yakunlanish holati
    finalized = models.BooleanField(default=False)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("lesson", "student")

    def __str__(self):
        return f"{self.student.username} - {self.lesson.id} - {self.status}"

    def finalize(self, ratio_threshold: float = 0.50) -> None:
        """Dars yakunida davomatni qayd qiladi."""
        if self.finalized:
            return
        total = self.face_check_count
        ok = self.face_success_count
        ratio = (ok / total) if total > 0 else 0.0
        self.face_verified_ratio = round(ratio, 4)
        self.status = "present" if ratio >= ratio_threshold else "absent"
        self.finalized = True
        self.finalized_at = timezone.now()
        self.save(update_fields=[
            "face_verified_ratio", "status", "finalized", "finalized_at",
        ])
