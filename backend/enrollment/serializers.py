from rest_framework import serializers

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult


class RegistrationWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationWindow
        fields = "__all__"


class ApplicantDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantDocument
        fields = "__all__"


class VerificationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationResult
        fields = "__all__"


class ApplicantSerializer(serializers.ModelSerializer):
    documents = ApplicantDocumentSerializer(read_only=True)
    verifications = VerificationResultSerializer(many=True, read_only=True)

    class Meta:
        model = Applicant
        fields = "__all__"
