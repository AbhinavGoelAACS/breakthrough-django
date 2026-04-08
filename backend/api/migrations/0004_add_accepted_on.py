"""
Add accepted_on column to paper table to track when papers are accepted.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_coauthor_user_invitation"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE `paper` ADD COLUMN `accepted_on` datetime(6) NULL;",
            ],
            reverse_sql=[
                "ALTER TABLE `paper` DROP COLUMN `accepted_on`;",
            ],
        ),
    ]
