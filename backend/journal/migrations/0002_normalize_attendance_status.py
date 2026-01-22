from django.db import migrations


def normalize_attendance(apps, schema_editor):
    JournalRecord = apps.get_model("journal", "JournalRecord")
    JournalRecord.objects.filter(attendance="late").update(attendance="present")


class Migration(migrations.Migration):
    dependencies = [
        ("journal", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(normalize_attendance, migrations.RunPython.noop),
    ]
