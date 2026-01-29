from django.urls import path

from .views import (
    StudentAIRecommendationView,
    MaterialAIAnswerView,
    PassportOCRView,
    FaceMatchView,
    PresenceCheckView,
    AISettingsView,
    AIHealthView,
)


urlpatterns = [
    # Student uchun AI tavsiya
    path("student/<int:student_id>/recommendations/", StudentAIRecommendationView.as_view()),
    # Material bo'yicha savol-javob (AI stub/real)
    path("material/ask/", MaterialAIAnswerView.as_view()),
    path("settings/", AISettingsView.as_view()),
    path("settings/rotate-api-key/", AISettingsView.as_view(), {"action": "rotate_api_key"}),
    path("health/", AIHealthView.as_view()),
    # Registratsiya: pasport OCR va yuz solishtirish
    path("ocr/passport/", PassportOCRView.as_view()),
    path("face/match/", FaceMatchView.as_view()),
    # Online dars/imtihon: yuz presence
    path("face/presence/", PresenceCheckView.as_view()),
]
