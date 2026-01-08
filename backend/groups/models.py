import re

from django.core.exceptions import ValidationError
from django.db import models
from directions.models import Direction
from semesters.models import Semester, SemesterSettings

class Group(models.Model):
    name = models.CharField(max_length=50, unique=True, blank=True)  # AX-24-UZ-1 (auto)
    direction = models.ForeignKey(Direction, on_delete=models.CASCADE)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, blank=True)
    language = models.CharField(max_length=10, choices=[
        ('uz', 'Uzbek'),
        ('ru', 'Russian'),
        ('en', 'English'),
    ], blank=True)
    year = models.IntegerField()  # masalan: 2024, 2025

    def _direction_code(self) -> str:
        name = (self.direction.name or "").strip()
        if not name:
            return "DIR"
        parts = [p for p in re.split(r"\s+", name) if p]
        code = "".join(p[0] for p in parts).upper()
        if len(code) < 2:
            code = (name[:2]).upper()
        return code[:4]

    def _generate_name(self) -> str:
        code = self._direction_code()
        year_suffix = str(self.year)[-2:]
        lang = (self.language or "").upper()
        if not lang and getattr(self.direction, "language", ""):
            lang = self.direction.language.upper()
        prefix = f"{code}-{year_suffix}-{lang or 'XX'}"
        existing = Group.objects.filter(name__startswith=f"{prefix}-").values_list("name", flat=True)
        numbers = []
        for name in existing:
            match = re.match(rf"^{re.escape(prefix)}-(\d+)$", name)
            if match:
                numbers.append(int(match.group(1)))
        seq = max(numbers) + 1 if numbers else 1
        return f"{prefix}-{seq}"

    def save(self, *args, **kwargs):
        if not self.semester_id:
            self.semester = SemesterSettings.get_active_semester()
        if not self.semester_id:
            raise ValidationError({"semester": "Semestr topilmadi. Aktiv semestr sozlang."})
        if not self.language and getattr(self.direction, "language", ""):
            self.language = self.direction.language
        if not self.name:
            self.name = self._generate_name()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
