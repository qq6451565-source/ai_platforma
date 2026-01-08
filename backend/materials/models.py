from django.db import models
from subjects.models import Subject
from accounts.models import User
from groups.models import Group


class Material(models.Model):
    MATERIAL_TYPES = [
        ('pdf', 'PDF File'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('ppt', 'PowerPoint'),
        ('doc', 'Word Document'),
        ('image', 'Image'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True, default="")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES)
    file = models.FileField(upload_to="materials/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.subject.name})"
