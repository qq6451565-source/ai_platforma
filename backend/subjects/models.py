from django.db import models
from directions.models import Direction
from semesters.models import Semester

class Subject(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    directions = models.ManyToManyField(Direction)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    subject_type = models.CharField(max_length=20, choices=[
        ('required', 'Required'),
        ('elective', 'Elective'),
    ])

    def __str__(self):
        return f"{self.name} ({self.code})"
