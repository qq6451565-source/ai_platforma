from django.db import models

from accounts.models import User
from subjects.models import Subject


class GradebookEntry(models.Model):
    student = models.ForeignKey(User, on_delete=models.PROTECT, limit_choices_to={"role": "student"})
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)

    assignment_score = models.FloatField(default=0.0)
    midterm_score = models.FloatField(default=0.0)
    total_score = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "subject")

    def calculate_total(self):
        return self.assignment_score + self.midterm_score

    def save(self, *args, **kwargs):
        self.total_score = self.calculate_total()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_id} / {self.subject.name}"
