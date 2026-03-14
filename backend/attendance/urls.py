from django.urls import path
from .views import (
    AttendanceOverrideHistoryView,
    MarkAttendanceView,
    LessonAttendanceView,
    StudentAttendanceHistoryView,
    PresenceCheckView,
)

urlpatterns = [
    path('mark/', MarkAttendanceView.as_view()),
    path('presence-check/', PresenceCheckView.as_view()),
    path('lesson/<int:lesson_id>/', LessonAttendanceView.as_view()),
    path('lesson/<int:lesson_id>/student/<int:student_id>/overrides/', AttendanceOverrideHistoryView.as_view()),
    path('student/<int:student_id>/', StudentAttendanceHistoryView.as_view()),
]
