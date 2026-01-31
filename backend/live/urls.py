from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CreateLiveLessonView,
    JoinLiveLessonView,
    LiveRoomViewSet,
    LiveParticipantViewSet,
    JoinLiveRoomView,
    LeaveLiveRoomView,
    EndLiveRoomView,
    AgoraTokenView,
)

router = DefaultRouter()
router.register("rooms", LiveRoomViewSet, basename="live-rooms")
router.register("participants", LiveParticipantViewSet, basename="live-participants")

urlpatterns = [
    path("", include(router.urls)),
    path('create/', CreateLiveLessonView.as_view()),
    path('join/<int:lesson_id>/', JoinLiveLessonView.as_view()),
    path('room/create/', LiveRoomViewSet.as_view({'post': 'create'}), name='live-room-create'),
    path('room/join/', JoinLiveRoomView.as_view(), name='live-room-join'),
    path('room/leave/', LeaveLiveRoomView.as_view(), name='live-room-leave'),
    path('room/end/', EndLiveRoomView.as_view(), name='live-room-end'),
    path('agora/token/', AgoraTokenView.as_view(), name='agora-token'),
]
