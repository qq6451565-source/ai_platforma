from django.db import models
from directions.models import Direction
from django.core.exceptions import ValidationError

from semesters.models import Semester, SemesterSettings
from subjects.models import Subject

class Curriculum(models.Model):
    direction = models.ForeignKey(Direction, on_delete=models.CASCADE)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, blank=True)
    subjects = models.ManyToManyField(Subject)

    def __str__(self):
        return f"{self.direction.name} - {self.semester.number}-semester"

    def save(self, *args, **kwargs):
        if not self.semester_id:
            self.semester = SemesterSettings.get_active_semester()
        if not self.semester_id:
            raise ValidationError({"semester": "Semestr topilmadi. Aktiv semestr sozlang."})
        super().save(*args, **kwargs)
