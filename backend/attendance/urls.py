from django.urls import path
from .views import (
    AttendanceOverrideHistoryView,
    MarkAttendanceView,
    LessonAttendanceView,
    StudentAttendanceHistoryView,
    PresenceCheckView,
    # Activity tracking
    LessonOpenView,
    MaterialViewedView,
    MyActivityLogView,
    LessonActivityListView,
    ActivityReportView,
)

urlpatterns = [
    path('mark/', MarkAttendanceView.as_view()),
    path('presence-check/', PresenceCheckView.as_view()),
    path('lesson/<int:lesson_id>/', LessonAttendanceView.as_view()),
    path('lesson/<int:lesson_id>/student/<int:student_id>/overrides/', AttendanceOverrideHistoryView.as_view()),
    path('student/<int:student_id>/', StudentAttendanceHistoryView.as_view()),

    # LessonActivityLog — dars faoliyati davomati
    path('activity/lesson-open/', LessonOpenView.as_view()),
    path('activity/material-viewed/', MaterialViewedView.as_view()),
    path('activity/my/', MyActivityLogView.as_view()),
    path('activity/lesson/<int:lesson_id>/', LessonActivityListView.as_view()),
    path('activity/report/', ActivityReportView.as_view()),
]
