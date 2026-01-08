from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SemesterSettingsView, SemesterViewSet

router = DefaultRouter()
router.register('', SemesterViewSet, basename='semesters')

urlpatterns = [
    path("settings/", SemesterSettingsView.as_view(), name="semester-settings"),
]
urlpatterns += router.urls
