from django.contrib import admin

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult

admin.site.register(RegistrationWindow)
admin.site.register(Applicant)
admin.site.register(ApplicantDocument)
admin.site.register(VerificationResult)
