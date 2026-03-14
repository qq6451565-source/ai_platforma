from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_user_birth_date"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auditlog",
            name="action",
            field=models.CharField(
                choices=[
                    ("login_success", "Login success"),
                    ("login_failed", "Login failed"),
                    ("logout", "Logout"),
                    ("role_changed", "Role changed"),
                    ("enrollment_approved", "Enrollment approved"),
                    ("enrollment_override_approved", "Enrollment override approved"),
                    ("enrollment_rejected", "Enrollment rejected"),
                    ("enrollment_reverified", "Enrollment reverified"),
                ],
                max_length=50,
            ),
        ),
    ]
