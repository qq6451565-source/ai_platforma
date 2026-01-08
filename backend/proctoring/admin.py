from django.contrib import admin

from .models import ProctorSession, ProctorEvent

admin.site.register(ProctorSession)
admin.site.register(ProctorEvent)
