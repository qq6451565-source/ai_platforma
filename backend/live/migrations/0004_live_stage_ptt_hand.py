from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("live", "0003_liveparticipant_unique"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="liveroom",
            name="stage_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="stage_rooms",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="liveroom",
            name="allow_ptt",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="liveparticipant",
            name="hand_raised",
            field=models.BooleanField(default=False),
        ),
    ]
