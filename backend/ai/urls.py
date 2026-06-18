from django.urls import path

from .views import (
    AISettingsView,
    AIHealthView,
)


urlpatterns = [
    path("settings/", AISettingsView.as_view()),
    path("settings/rotate-api-key/", AISettingsView.as_view(), {"action": "rotate_api_key"}),
    path("health/", AIHealthView.as_view()),
]
