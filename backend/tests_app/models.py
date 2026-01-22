from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

from subjects.models import Subject
from groups.models import Group
from lessons.models import Lesson


class Test(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="tests")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="tests", null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="tests", null=True, blank=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tests",
        limit_choices_to={"role": "teacher"},
    )

    time_limit_minutes = models.PositiveIntegerField(default=20)
    total_score = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=100,
        validators=[MinValueValidator(1)],
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        group_name = self.group.name if self.group else "no-group"
        return f"{self.title} ({group_name})"


class Question(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    order = models.PositiveIntegerField(default=1)
    points = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=1,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.test.title}"


class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"Option({self.question.id})"
