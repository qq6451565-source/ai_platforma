from django.contrib import admin

from .models import Campus, Faculty, Department, Degree, StudyMode

admin.site.register(Campus)
admin.site.register(Faculty)
admin.site.register(Department)
admin.site.register(Degree)
admin.site.register(StudyMode)
