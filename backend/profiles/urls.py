from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    StudentProfileViewSet,
    TeacherProfileViewSet,
    StudentDashboardView,
    StudentProgressStatsView,
)

router = DefaultRouter()
router.register("students", StudentProfileViewSet)
router.register("teachers", TeacherProfileViewSet)

urlpatterns = router.urls + [
    path("dashboard/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("progress/", StudentProgressStatsView.as_view(), name="student-progress"),
]
