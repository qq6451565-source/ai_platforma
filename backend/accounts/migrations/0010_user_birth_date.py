from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_user_registration_fields_and_email_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="birth_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
