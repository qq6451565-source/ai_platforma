from django.urls import path

from .views import (
    PassportOCRView,
    FaceMatchView,
    PresenceCheckView,
    AISettingsView,
    AIHealthView,
)


urlpatterns = [
    path("settings/", AISettingsView.as_view()),
    path("settings/rotate-api-key/", AISettingsView.as_view(), {"action": "rotate_api_key"}),
    path("health/", AIHealthView.as_view()),
    # Registratsiya: pasport OCR va yuz solishtirish
    path("ocr/passport/", PassportOCRView.as_view()),
    path("face/match/", FaceMatchView.as_view()),
    # Online dars/imtihon: yuz presence
    path("face/presence/", PresenceCheckView.as_view()),
]
