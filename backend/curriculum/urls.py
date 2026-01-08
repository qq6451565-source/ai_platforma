from rest_framework.routers import DefaultRouter
from .views import CurriculumViewSet

router = DefaultRouter()
router.register('', CurriculumViewSet, basename='curriculum')

urlpatterns = router.urls
