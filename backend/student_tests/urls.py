from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StartStudentTestView,
    AnswerStudentTestView,
    FinishStudentTestView,
    StudentTestAdminViewSet,
    StudentAnswerAdminViewSet,
)

router = DefaultRouter()
router.register("records", StudentTestAdminViewSet, basename="student-tests")
router.register("answers", StudentAnswerAdminViewSet, basename="student-answers")

urlpatterns = [
    path("", include(router.urls)),
    path("start/", StartStudentTestView.as_view(), name="student_test_start"),
    path("<int:student_test_id>/answer/", AnswerStudentTestView.as_view(), name="student_test_answer"),
    path("<int:student_test_id>/finish/", FinishStudentTestView.as_view(), name="student_test_finish"),
]
