from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    ProctorSessionViewSet,
    ProctorEventViewSet,
    StartProctorSessionView,
    StartProctorSessionForStudentTestView,
    FinishProctorSessionView,
    AddProctorEventView,
    VerifyProctorSessionView,
    PresenceProctorSessionView,
)


router = DefaultRouter()
router.register("sessions", ProctorSessionViewSet)
router.register("events", ProctorEventViewSet)

urlpatterns = router.urls + [
    path("sessions/start/<int:attempt_id>/", StartProctorSessionView.as_view()),
    path("sessions/start-test/<int:student_test_id>/", StartProctorSessionForStudentTestView.as_view()),
    path("sessions/finish/<int:session_id>/", FinishProctorSessionView.as_view()),
    path("sessions/verify/<int:session_id>/", VerifyProctorSessionView.as_view()),
    path("sessions/presence/<int:session_id>/", PresenceProctorSessionView.as_view()),
    path("events/add/<int:session_id>/", AddProctorEventView.as_view()),
]
