from django.db import models
from subjects.models import Subject
from accounts.models import User
from groups.models import Group
from lessons.models import Lesson


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
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="materials")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True)
    groups = models.ManyToManyField(Group, related_name="materials", blank=True)

    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, null=True, blank=True)
    file = models.FileField(upload_to="materials/", null=True, blank=True)
    current_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.subject.name})"


class MaterialResource(models.Model):
    RESOURCE_TYPES = [
        ("file", "File"),
        ("link", "Link"),
        ("video", "Video"),
    ]

    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name="resources")
    version = models.PositiveIntegerField(default=1)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    title = models.CharField(max_length=255, blank=True, default="")
    file = models.FileField(upload_to="materials/resources/", null=True, blank=True)
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.material.title} v{self.version}"
