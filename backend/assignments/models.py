from django.db import models
from teacher_subject.models import TeacherSubject
from accounts.models import User

def assignment_file_path(instance, filename):
    return f"assignments/{instance.teacher_subject.teacher.id}/{filename}"

def submission_file_path(instance, filename):
    return f"submissions/{instance.student.id}/{filename}"


class Assignment(models.Model):
    teacher_subject = models.ForeignKey(TeacherSubject, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=assignment_file_path, null=True, blank=True)
    deadline = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE)
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    file = models.FileField(upload_to=submission_file_path, blank=True)
    comment = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    grade = models.FloatField(null=True, blank=True)
    teacher_comment = models.TextField(blank=True)

    def __str__(self):
        return f"{self.student.username} -> {self.assignment.title}"
