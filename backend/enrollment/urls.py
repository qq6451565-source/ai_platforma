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
    ApplicantRegisterStartView,
    ApplicantRegisterFinalizeView,
    ReverifyApplicantView,
    SelfReverifyApplicantView,
    PassportOCRPreviewView,
)


router = DefaultRouter()
router.register("windows", RegistrationWindowViewSet)
router.register("applicants", ApplicantViewSet)
router.register("documents", ApplicantDocumentViewSet)
router.register("verifications", VerificationResultViewSet)

urlpatterns = router.urls + [
    path("register/", ApplicantRegisterView.as_view()),
    path("register/start/", ApplicantRegisterStartView.as_view()),
    path("register/finalize/", ApplicantRegisterFinalizeView.as_view()),
    path("approve/<int:applicant_id>/", ApproveApplicantView.as_view()),
    path("reject/<int:applicant_id>/", RejectApplicantView.as_view()),
    path("reverify/<int:applicant_id>/", ReverifyApplicantView.as_view()),
    path("reverify/self/", SelfReverifyApplicantView.as_view()),
    path("register/ocr/", PassportOCRPreviewView.as_view()),
]
