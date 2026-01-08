from django.db import models
from accounts.models import User
from subjects.models import Subject
from groups.models import Group

class TeacherSubject(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'teacher'})
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    groups = models.ManyToManyField(Group)  # Bitta subject → bir nechta guruhga berilishi mumkin
    
    def __str__(self):
        return f"{self.teacher.first_name} {self.teacher.last_name} - {self.subject.name}"
