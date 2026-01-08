from rest_framework.routers import DefaultRouter
from .views import GroupMessageViewSet

router = DefaultRouter()
router.register(r'chat', GroupMessageViewSet)

urlpatterns = router.urls
