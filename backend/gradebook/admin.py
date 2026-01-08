from django.contrib import admin

from .models import GradebookEntry
from import_export import resources
from import_export.admin import ImportExportModelAdmin

class GradebookEntryResource(resources.ModelResource):
	class Meta:
		model = GradebookEntry

@admin.register(GradebookEntry)
class GradebookEntryAdmin(ImportExportModelAdmin):
	resource_class = GradebookEntryResource
