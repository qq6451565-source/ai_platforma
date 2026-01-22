import re

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from directions.models import Direction

class Group(models.Model):
    name = models.CharField(max_length=50, unique=True, blank=True)  # AX-24-UZ-1 (auto)
    direction = models.ForeignKey(Direction, on_delete=models.CASCADE)
    language = models.CharField(max_length=10, choices=[
        ('uz', 'Uzbek'),
        ('ru', 'Russian'),
        ('en', 'English'),
    ], blank=True)
    level = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    def _direction_label(self) -> str:
        name = (self.direction.name or "").strip()
        if not name:
            return "DIR"
        label = re.sub(r"\s+", "-", name)
        label = re.sub(r"[^\w\-]+", "", label, flags=re.UNICODE)
        label = re.sub(r"-{2,}", "-", label).strip("-")
        return label or "DIR"

    def _generate_name(self) -> str:
        label = self._direction_label()
        lang = (self.language or "").upper()
        if not lang and getattr(self.direction, "language", ""):
            lang = self.direction.language.upper()
        prefix = f"{label}-{self.level}-{lang or 'XX'}"
        existing = Group.objects.filter(name__startswith=f"{prefix}-").values_list("name", flat=True)
        numbers = []
        for name in existing:
            match = re.match(rf"^{re.escape(prefix)}-(\d+)$", name)
            if match:
                numbers.append(int(match.group(1)))
        seq = max(numbers) + 1 if numbers else 1
        return f"{prefix}-{seq}"

    def save(self, *args, **kwargs):
        if not self.language and getattr(self.direction, "language", ""):
            self.language = self.direction.language
        should_regen = False
        if self.pk:
            prev = (
                Group.objects.filter(pk=self.pk)
                .values("direction_id", "level", "language")
                .first()
            )
            if prev:
                prev_lang = prev.get("language") or ""
                curr_lang = self.language or ""
                if (
                    prev.get("direction_id") != self.direction_id
                    or prev.get("level") != self.level
                    or prev_lang != curr_lang
                ):
                    should_regen = True
        else:
            should_regen = True
        if not self.name or should_regen:
            self.name = self._generate_name()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
