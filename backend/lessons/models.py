from django.db import models
from teacher_subject.models import TeacherSubject
from groups.models import Group

class Lesson(models.Model):
    LESSON_TYPES = [
        ('pending', 'Pending'),
        ('live', 'Live Session'),
        ('video', 'Video Lesson'),
    ]
    
    teacher_subject = models.ForeignKey(TeacherSubject, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    topic = models.CharField(max_length=255)
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    lesson_type = models.CharField(max_length=20, choices=LESSON_TYPES, default='pending')
    video_material = models.ForeignKey('materials.Material', on_delete=models.SET_NULL, null=True, blank=True, related_name='video_lessons')

    def __str__(self):
        return f"{self.teacher_subject.subject.name} - {self.group.name}"
