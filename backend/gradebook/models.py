from django.db import models

from accounts.models import User
from subjects.models import Subject
from semesters.models import Semester


class GradebookEntry(models.Model):
    student = models.ForeignKey(User, on_delete=models.PROTECT, limit_choices_to={"role": "student"})
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)

    attendance_score = models.FloatField(default=0.0)
    assignment_score = models.FloatField(default=0.0)
    midterm_score = models.FloatField(default=0.0)
    final_score = models.FloatField(default=0.0)
    total_score = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "subject", "semester")

    def __str__(self):
        return f"{self.student_id} / {self.subject.name}"
