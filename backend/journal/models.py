from django.db import models
from accounts.models import User
from lessons.models import Lesson
from groups.models import Group


class JournalRecord(models.Model):
    """
    Har bir dars uchun har bir student bo‘yicha jurnal yozuvi.
    """
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='journal_records')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    attendance = models.CharField(
        max_length=20,
        choices=[
            ('present', 'Kelgan'),
            ('absent', 'Kelmagan'),
            ('late', 'Kech qolgan')
        ],
        default='present'
    )

    grade = models.IntegerField(null=True, blank=True)  # dars uchun baho
    comment = models.TextField(null=True, blank=True)   # o‘qituvchi izohi
    date = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('lesson', 'student')

    def __str__(self):
        return f"{self.student.username} - {self.lesson.title} ({self.attendance})"
