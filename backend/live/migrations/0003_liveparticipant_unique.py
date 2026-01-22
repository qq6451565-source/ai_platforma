from django.db import migrations, models


def dedupe_live_participants(apps, schema_editor):
    LiveParticipant = apps.get_model("live", "LiveParticipant")
    duplicates = (
        LiveParticipant.objects.values("room_id", "user_id")
        .annotate(total=models.Count("id"))
        .filter(total__gt=1)
    )
    for dup in duplicates:
        qs = LiveParticipant.objects.filter(
            room_id=dup["room_id"],
            user_id=dup["user_id"],
        ).order_by("-joined_at", "-id")
        keep = qs.first()
        if keep:
            qs.exclude(id=keep.id).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("live", "0002_remove_liveroom_created_at_liveroom_ended_at_and_more"),
    ]

    operations = [
        migrations.RunPython(dedupe_live_participants, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="liveparticipant",
            constraint=models.UniqueConstraint(
                fields=("room", "user"),
                name="unique_live_participant",
            ),
        ),
    ]
