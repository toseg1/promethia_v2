from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_race_description_alter_race_distance'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customevent',
            name='date_end',
            field=models.DateTimeField(blank=True, help_text='End date and time of the event (optional)', null=True),
        ),
    ]

