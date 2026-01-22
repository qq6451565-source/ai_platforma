from django.db import models

from groups.models import Group
from subjects.models import Subject

from accounts.models import User


class Timetable(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.group.name}"


class LessonSlot(models.Model):
    MODE_CHOICES = (
        ("online", "Online"),
        ("offline", "Offline"),
    )

    timetable = models.ForeignKey(Timetable, on_delete=models.CASCADE, related_name="slots")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    teacher = models.ForeignKey(User, on_delete=models.PROTECT, limit_choices_to={"role": "teacher"})
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    room = models.CharField(max_length=100, blank=True, default="")
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="offline")

    def __str__(self):
        return f"{self.subject.name} ({self.start_time})"
