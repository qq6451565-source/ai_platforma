from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    RegistrationWindowViewSet,
    ApplicantViewSet,
    ApplicantDocumentViewSet,
    VerificationResultViewSet,
    ApproveApplicantView,
    RejectApplicantView,
    ApplicantRegisterView,
    ReverifyApplicantView,
)


router = DefaultRouter()
router.register("windows", RegistrationWindowViewSet)
router.register("applicants", ApplicantViewSet)
router.register("documents", ApplicantDocumentViewSet)
router.register("verifications", VerificationResultViewSet)

urlpatterns = router.urls + [
    path("register/", ApplicantRegisterView.as_view()),
    path("approve/<int:applicant_id>/", ApproveApplicantView.as_view()),
    path("reject/<int:applicant_id>/", RejectApplicantView.as_view()),
    path("reverify/<int:applicant_id>/", ReverifyApplicantView.as_view()),
]
