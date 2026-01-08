from django.db import models

from accounts.models import User
from subjects.models import Subject
from groups.models import Group
from semesters.models import Semester


class ExamType(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Exam(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    group = models.ForeignKey(Group, on_delete=models.PROTECT)
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)
    teacher = models.ForeignKey(User, on_delete=models.PROTECT, limit_choices_to={"role": "teacher"})
    exam_type = models.ForeignKey(ExamType, on_delete=models.PROTECT)

    duration_minutes = models.PositiveIntegerField(default=30)
    attempts = models.PositiveIntegerField(default=1)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    proctoring_required = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.subject.name} / {self.exam_type.name}"


class ExamAttempt(models.Model):
    STATUS_CHOICES = (
        ("started", "Started"),
        ("finished", "Finished"),
        ("expired", "Expired"),
    )

    student = models.ForeignKey(User, on_delete=models.PROTECT, limit_choices_to={"role": "student"})
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="exam_attempts")
    attempt_no = models.PositiveIntegerField(default=1)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    score_percent = models.FloatField(default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="started")

    class Meta:
        unique_together = ("student", "exam", "attempt_no")

    def __str__(self):
        return f"{self.student_id} / {self.exam_id}"
