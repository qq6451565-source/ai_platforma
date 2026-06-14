from django.db import models
from django.utils import timezone
from lessons.models import Lesson
from accounts.models import User

# Ball taqsimoti konstantalari
ACTIVITY_SCORE_LESSON_OPEN = 20       # Dars sahifasini ochganlik
ACTIVITY_SCORE_MATERIAL_VIEW = 30     # Material/video ko'rganlik
ACTIVITY_SCORE_TEST = 30              # Test ishlash (to'liq)
ACTIVITY_SCORE_ASSIGNMENT = 20       # Topshiriq yuborish

ACTIVITY_STATUS_ACTIVE = "active"           # 70+
ACTIVITY_STATUS_PARTIAL = "partial"         # 40-69
ACTIVITY_STATUS_ABSENT = "absent"           # <40

ACTIVITY_THRESHOLD_ACTIVE = 70
ACTIVITY_THRESHOLD_PARTIAL = 40


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
    manual_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    overridden_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_overrides",
    )
    overridden_at = models.DateTimeField(null=True, blank=True)

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


class AttendanceOverrideLog(models.Model):
    attendance = models.ForeignKey(
        Attendance,
        on_delete=models.CASCADE,
        related_name="override_logs",
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "student"},
        related_name="attendance_override_logs",
    )
    previous_status = models.CharField(
        max_length=10,
        choices=Attendance.ATTEND_CHOICES,
        null=True,
        blank=True,
    )
    new_status = models.CharField(max_length=10, choices=Attendance.ATTEND_CHOICES)
    previous_finalized = models.BooleanField(default=False)
    new_finalized = models.BooleanField(default=True)
    reason = models.TextField()
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_override_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"AttendanceOverrideLog(attendance={self.attendance_id}, new_status={self.new_status})"


class LessonActivityLog(models.Model):
    """
    Mavjud dars ichida talabaning faoliyatini qayd etadi.
    To'rtta ko'rsatkich bo'yicha 0-100 ball hisoblanadi:
      lesson_opened      → 20 ball
      material_viewed    → 30 ball
      test_score (≥60%) → 30 ball (proporsional)
      assignment_submitted → 20 ball
    """

    ACTIVITY_STATUS_CHOICES = [
        (ACTIVITY_STATUS_ACTIVE, "Faol qatnashdi"),
        (ACTIVITY_STATUS_PARTIAL, "Qisman qatnashdi"),
        (ACTIVITY_STATUS_ABSENT, "Qatnashmadi"),
    ]

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "student"},
        related_name="activity_logs",
    )

    # Ko'rsatkichlar
    lesson_opened = models.BooleanField(default=False)
    material_viewed = models.BooleanField(default=False)
    material_viewed_at = models.DateTimeField(null=True, blank=True)
    test_score = models.FloatField(default=0.0)       # 0.0 – 100.0
    test_attended = models.BooleanField(default=False)
    assignment_submitted = models.BooleanField(default=False)

    # Hisoblangan natija
    total_score = models.FloatField(default=0.0)      # 0 – 100
    status = models.CharField(
        max_length=10,
        choices=ACTIVITY_STATUS_CHOICES,
        default=ACTIVITY_STATUS_ABSENT,
    )

    # Metadata
    lesson_opened_at = models.DateTimeField(null=True, blank=True)
    assignment_submitted_at = models.DateTimeField(null=True, blank=True)
    computed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("lesson", "student")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.student.username} | {self.lesson_id} | {self.status} ({self.total_score:.0f}pts)"

    def compute_score(self) -> float:
        """Ball hisobi va statusni yangilaydi."""
        score = 0.0

        if self.lesson_opened:
            score += ACTIVITY_SCORE_LESSON_OPEN

        if self.material_viewed:
            score += ACTIVITY_SCORE_MATERIAL_VIEW

        # Test: proporsional (faqat 60%+ bo'lsa to'liq ball)
        if self.test_attended:
            test_contribution = (self.test_score / 100.0) * ACTIVITY_SCORE_TEST
            score += test_contribution

        if self.assignment_submitted:
            score += ACTIVITY_SCORE_ASSIGNMENT

        self.total_score = round(min(score, 100.0), 2)

        if self.total_score >= ACTIVITY_THRESHOLD_ACTIVE:
            self.status = ACTIVITY_STATUS_ACTIVE
        elif self.total_score >= ACTIVITY_THRESHOLD_PARTIAL:
            self.status = ACTIVITY_STATUS_PARTIAL
        else:
            self.status = ACTIVITY_STATUS_ABSENT

        self.computed_at = timezone.now()
        return self.total_score

    def save_computed(self):
        """Ballni hisoblab bazaga yozadi."""
        self.compute_score()
        self.save(update_fields=[
            "total_score", "status", "computed_at",
            "lesson_opened", "lesson_opened_at",
            "material_viewed", "material_viewed_at",
            "test_score", "test_attended",
            "assignment_submitted", "assignment_submitted_at",
        ])
