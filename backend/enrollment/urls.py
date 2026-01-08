from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    RegistrationWindowViewSet,
    ApplicantViewSet,
    ApplicantDocumentViewSet,
    VerificationResultViewSet,
    ApproveApplicantView,
    RejectApplicantView,
)


router = DefaultRouter()
router.register("windows", RegistrationWindowViewSet)
router.register("applicants", ApplicantViewSet)
router.register("documents", ApplicantDocumentViewSet)
router.register("verifications", VerificationResultViewSet)

urlpatterns = router.urls + [
    path("approve/<int:applicant_id>/", ApproveApplicantView.as_view()),
    path("reject/<int:applicant_id>/", RejectApplicantView.as_view()),
]
