"""
Add auto_assign and for_version columns to reviewer_invitation table.
These support queued reviewer pre-assignments during editor decision flow.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_change_assigned_on_datetime"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE `reviewer_invitation` ADD COLUMN `auto_assign` tinyint(1) NOT NULL DEFAULT 0;",
                "ALTER TABLE `reviewer_invitation` ADD COLUMN `for_version` int NULL;",
            ],
            reverse_sql=[
                "ALTER TABLE `reviewer_invitation` DROP COLUMN `auto_assign`;",
                "ALTER TABLE `reviewer_invitation` DROP COLUMN `for_version`;",
            ],
        ),
    ]
