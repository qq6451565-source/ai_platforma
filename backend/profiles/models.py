from django.db import models

from accounts.models import User
from groups.models import Group
from directions.models import Direction


class StudentProfile(models.Model):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("academic_leave", "Academic Leave"),
        ("expelled", "Expelled"),
        ("graduated", "Graduated"),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    direction = models.ForeignKey(Direction, on_delete=models.PROTECT, null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True)
    admission_year = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    def __str__(self):
        label = self.direction.name if self.direction else "No direction"
        return f"{self.user.username} - {label}"


class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")

    def __str__(self):
        return self.user.username
