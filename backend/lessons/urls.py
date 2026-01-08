from rest_framework.routers import DefaultRouter
from .views import LessonViewSet

router = DefaultRouter()
router.register('', LessonViewSet, basename='lessons')

urlpatterns = router.urls
