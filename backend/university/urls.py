from rest_framework.routers import DefaultRouter

from .views import (
    CampusViewSet,
    FacultyViewSet,
    DepartmentViewSet,
    DegreeViewSet,
    StudyModeViewSet,
)


router = DefaultRouter()
router.register("campuses", CampusViewSet)
router.register("faculties", FacultyViewSet)
router.register("departments", DepartmentViewSet)
router.register("degrees", DegreeViewSet)
router.register("study-modes", StudyModeViewSet)

urlpatterns = router.urls
