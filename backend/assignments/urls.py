from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AssignmentViewSet, SubmitAssignmentView, GradeSubmissionView, MySubmissionsView

router = DefaultRouter()
router.register("assignments", AssignmentViewSet)

urlpatterns = [
    path("submissions/", MySubmissionsView.as_view()),
    path("submit/", SubmitAssignmentView.as_view()),
    path("grade/<int:submission_id>/", GradeSubmissionView.as_view()),
]

urlpatterns += router.urls
