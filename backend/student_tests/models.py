from django.db import models
from django.conf import settings

from tests_app.models import Test, Question, Option


class StudentTest(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_tests",
        limit_choices_to={"role": "student"},
    )
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name="student_tests")

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    current_question_index = models.PositiveIntegerField(default=0)
    score_percent = models.FloatField(default=0.0)
    is_finished = models.BooleanField(default=False)

    # Proctoring natijasi
    is_accepted = models.BooleanField(default=True)
    rejected_reason = models.CharField(max_length=255, blank=True, default="")
    face_verified_ratio = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("student", "test")

    def __str__(self):
        return f"{self.student.username} -> {self.test.title}"


class StudentAnswer(models.Model):
    student_test = models.ForeignKey(StudentTest, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(Option, on_delete=models.SET_NULL, null=True, blank=True)

    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student_test", "question")

    def __str__(self):
        return f"Ans({self.student_test_id}) Q{self.question_id}"
