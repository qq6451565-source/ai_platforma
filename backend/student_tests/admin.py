from django.contrib import admin
from .models import StudentTest, StudentAnswer


@admin.register(StudentTest)
class StudentTestAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "test", "current_question_index", "is_finished", "score_percent", "started_at", "finished_at")
    list_filter = ("is_finished",)
    search_fields = ("student__username", "test__title")


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "student_test", "question", "selected_option", "is_correct", "answered_at")
    list_filter = ("is_correct",)
