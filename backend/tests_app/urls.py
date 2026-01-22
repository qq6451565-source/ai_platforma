from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestViewSet, QuestionViewSet, OptionViewSet, TestUploadView

router = DefaultRouter()
router.register(r"", TestViewSet, basename="tests")
router.register(r"questions", QuestionViewSet, basename="questions")
router.register(r"options", OptionViewSet, basename="options")

urlpatterns = [
    path("upload/", TestUploadView.as_view(), name="tests-upload"),
    path("", include(router.urls)),
]
