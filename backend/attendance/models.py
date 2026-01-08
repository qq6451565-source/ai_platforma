from django.db import models
from lessons.models import Lesson
from accounts.models import User

class Attendance(models.Model):
    ATTEND_CHOICES = (
        ('present', 'Bor'),
        ('absent', 'Yo‘q'),
        ('late', 'Kechikdi'),
    )

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    status = models.CharField(max_length=10, choices=ATTEND_CHOICES, default='absent')
    timestamp = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('lesson', 'student')

    def __str__(self):
        return f"{self.student.username} - {self.lesson.id} - {self.status}"
