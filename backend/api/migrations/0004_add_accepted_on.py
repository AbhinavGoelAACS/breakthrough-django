"""
Add accepted_on column to paper table to track when papers are accepted.
"""
from django.db import migrations, connection


def add_accepted_on_column(apps, schema_editor):
    """Add accepted_on column if it doesn't already exist."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='paper' AND COLUMN_NAME='accepted_on'")
        if not cursor.fetchone():
            # Column doesn't exist, add it
            cursor.execute("ALTER TABLE `paper` ADD COLUMN `accepted_on` datetime(6) NULL;")


def remove_accepted_on_column(apps, schema_editor):
    """Remove accepted_on column if it exists."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='paper' AND COLUMN_NAME='accepted_on'")
        if cursor.fetchone():
            # Column exists, remove it
            cursor.execute("ALTER TABLE `paper` DROP COLUMN `accepted_on`;")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_coauthor_user_invitation"),
    ]

    operations = [
        migrations.RunPython(add_accepted_on_column, remove_accepted_on_column),
    ]
