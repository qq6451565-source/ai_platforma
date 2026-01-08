from django.urls import path
from .views import (
    StudentStatsView,
    TeacherStatsView,
    GroupStatsView,
    StudentDashboardView,
    TeacherDashboardView,
    AdminDashboardView,
    ExportGradebookPDFView,
)

urlpatterns = [
    # Oddiy statistika
    path("student/<int:student_id>/", StudentStatsView.as_view()),
    path("teacher/<int:teacher_id>/", TeacherStatsView.as_view()),
    path("group/<int:group_id>/", GroupStatsView.as_view()),

    # Dashboardlar
    path("dashboard/student/<int:student_id>/", StudentDashboardView.as_view()),
    path("dashboard/teacher/<int:teacher_id>/", TeacherDashboardView.as_view()),
    path("dashboard/admin/", AdminDashboardView.as_view()),

    # Export
    path("export/gradebook/pdf/", ExportGradebookPDFView.as_view()),
]
