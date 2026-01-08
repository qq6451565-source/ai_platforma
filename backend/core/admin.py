from django.contrib import admin
from auditlog.models import LogEntry

@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ('object_repr', 'action', 'actor', 'timestamp', 'changes')
    search_fields = ('object_repr', 'actor__username', 'changes')
    list_filter = ('action', 'timestamp')
