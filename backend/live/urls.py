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
    SyncLiveRoomsView,
    LiveRoomStateView,
    RaiseHandView,
    SetStageUserView,
    PushToTalkView,
    FaceVerificationSettingsView,
    StartFaceVerificationView,
    AnalyzeFrameView,
    LiveMonitoringView,
    FaceSessionListView,
    FaceEventListView,
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
    path('state/', LiveRoomStateView.as_view(), name='live-state'),
    path('hand/', RaiseHandView.as_view(), name='live-hand'),
    path('stage/', SetStageUserView.as_view(), name='live-stage'),
    path('ptt/', PushToTalkView.as_view(), name='live-ptt'),
    path('sync/', SyncLiveRoomsView.as_view(), name='live-sync'),
    
    # Face verification endpoints
    path('face/settings/', FaceVerificationSettingsView.as_view(), name='face-settings'),
    path('face/start/', StartFaceVerificationView.as_view(), name='face-start'),
    path('face/analyze/', AnalyzeFrameView.as_view(), name='face-analyze'),
    path('face/monitoring/', LiveMonitoringView.as_view(), name='face-monitoring'),
    path('face/sessions/', FaceSessionListView.as_view(), name='face-sessions'),
    path('face/events/', FaceEventListView.as_view(), name='face-events'),
]
