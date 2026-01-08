from rest_framework.routers import DefaultRouter
from .views import TeacherSubjectViewSet

router = DefaultRouter()
router.register('', TeacherSubjectViewSet, basename='teacher-subject')

urlpatterns = router.urls
