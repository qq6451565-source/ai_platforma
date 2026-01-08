from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import GradebookEntryViewSet, RecalculateGradebookView


router = DefaultRouter()
router.register("entries", GradebookEntryViewSet)

urlpatterns = router.urls + [
    path("recalculate/<int:entry_id>/", RecalculateGradebookView.as_view()),
]
