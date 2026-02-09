from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("enrollment", "0006_alter_applicant_options"),
    ]

    operations = [
        migrations.AlterField(
            model_name="applicantdocument",
            name="passport_back",
            field=models.ImageField(blank=True, null=True, upload_to="applicants/passport/"),
        ),
    ]
