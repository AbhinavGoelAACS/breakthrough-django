"""
Add user_id and invitation_token columns to paper_co_author table.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_create_copyright_form"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE `paper_co_author` ADD COLUMN `user_id` integer NULL AFTER `paper_id`;",
                "ALTER TABLE `paper_co_author` ADD COLUMN `invitation_token` varchar(255) NULL AFTER `is_corresponding`;",
            ],
            reverse_sql=[
                "ALTER TABLE `paper_co_author` DROP COLUMN `user_id`;",
                "ALTER TABLE `paper_co_author` DROP COLUMN `invitation_token`;",
            ],
        ),
    ]
