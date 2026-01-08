from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JournalRecordViewSet,
    JournalLessonStudentsView,
    JournalMarkView,
    GetStudentJournalView,
)

router = DefaultRouter()
router.register('records', JournalRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('lesson/<int:lesson_id>/students/', JournalLessonStudentsView.as_view()),
    path('mark/', JournalMarkView.as_view()),
    path('student/<int:student_id>/', GetStudentJournalView.as_view()),
]
