from rest_framework.routers import DefaultRouter

from .views import TimetableViewSet, LessonSlotViewSet


router = DefaultRouter()
router.register("timetables", TimetableViewSet)
router.register("lesson-slots", LessonSlotViewSet)

urlpatterns = router.urls
