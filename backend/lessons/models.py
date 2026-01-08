from django.db import models
from teacher_subject.models import TeacherSubject
from groups.models import Group

class Lesson(models.Model):
    teacher_subject = models.ForeignKey(TeacherSubject, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    topic = models.CharField(max_length=255)
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __str__(self):
        return f"{self.teacher_subject.subject.name} - {self.group.name}"
