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
    joined_seconds = models.PositiveIntegerField(default=0)
    joined_ratio = models.FloatField(default=0.0)

    # Yakunlanish holati
    finalized = models.BooleanField(default=False)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("lesson", "student")

    def __str__(self):
        return f"{self.student.username} - {self.lesson.id} - {self.status}"

    def finalize(
        self,
        *,
        ratio_threshold: float = 0.50,
        duration_ratio_threshold: float = 0.70,
        minimum_face_checks: int = 1,
        joined_seconds: int | None = None,
    ) -> None:
        """Dars yakunida davomatni qayd qiladi."""
        if self.finalized:
            return
        total = self.face_check_count
        ok = self.face_success_count
        ratio = (ok / total) if total > 0 else 0.0
        effective_joined_seconds = max(0, int(self.joined_seconds if joined_seconds is None else joined_seconds))
        lesson_duration_seconds = 0
        if self.lesson.start_time and self.lesson.end_time and self.lesson.end_time > self.lesson.start_time:
            lesson_duration_seconds = int((self.lesson.end_time - self.lesson.start_time).total_seconds())
        duration_ratio = (
            effective_joined_seconds / lesson_duration_seconds
            if lesson_duration_seconds > 0 else 0.0
        )
        meets_face_requirement = total >= max(1, int(minimum_face_checks))
        meets_face_ratio = ratio >= ratio_threshold
        meets_duration_ratio = duration_ratio >= duration_ratio_threshold

        self.face_verified_ratio = round(ratio, 4)
        self.joined_seconds = effective_joined_seconds
        self.joined_ratio = round(duration_ratio, 4)
        self.status = "present" if (
            meets_face_requirement and meets_face_ratio and meets_duration_ratio
        ) else "absent"
        self.finalized = True
        self.finalized_at = timezone.now()
        self.save(update_fields=[
            "face_verified_ratio", "joined_seconds", "joined_ratio",
            "status", "finalized", "finalized_at",
        ])
