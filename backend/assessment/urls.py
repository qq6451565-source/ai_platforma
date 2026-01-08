from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    ExamTypeViewSet,
    ExamViewSet,
    ExamAttemptViewSet,
    StartExamAttemptView,
    FinishExamAttemptView,
)


router = DefaultRouter()
router.register("exam-types", ExamTypeViewSet)
router.register("exams", ExamViewSet)
router.register("attempts", ExamAttemptViewSet)

urlpatterns = router.urls + [
    path("attempts/start/<int:exam_id>/", StartExamAttemptView.as_view()),
    path("attempts/finish/<int:attempt_id>/", FinishExamAttemptView.as_view()),
]
