from django.contrib import admin

from .models import ExamType, Exam, ExamAttempt

admin.site.register(ExamType)
admin.site.register(Exam)
admin.site.register(ExamAttempt)
