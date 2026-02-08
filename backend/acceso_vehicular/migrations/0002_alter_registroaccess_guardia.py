# Generated migration for making guardia field optional

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('acceso_vehicular', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='registroacceso',
            name='guardia',
            field=models.ForeignKey(
                blank=True,
                help_text='Guardia que registró el acceso (opcional para registros públicos)',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='registros_acceso',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
