from django.contrib import admin
from .models import Test, Question, Option

class OptionInline(admin.TabularInline):
    model = Option
    extra = 2

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "group", "subject", "teacher", "time_limit_minutes", "is_active", "created_at")
    list_filter = ("group", "subject", "is_active")
    search_fields = ("title",)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "test", "order", "points")
    inlines = [OptionInline]

@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "is_correct")
