# Generated by Django 5.2 on 2025-05-07 15:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('frontend', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='password',
            field=models.CharField(default='user', max_length=50),
        ),
    ]
