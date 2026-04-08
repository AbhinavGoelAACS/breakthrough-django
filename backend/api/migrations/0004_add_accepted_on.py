"""
Add accepted_on column to paper table to track when papers are accepted.
"""
from django.db import migrations, connection


def add_accepted_on_column(apps, schema_editor):
    """Add accepted_on column if it doesn't already exist."""
    try:
        # Get the database name from connection
        db_settings = connection.settings_dict
        db_name = db_settings.get('NAME', '')
        
        with connection.cursor() as cursor:
            # Check if column exists
            query = """
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA=%s AND TABLE_NAME='paper' AND COLUMN_NAME='accepted_on'
            """
            cursor.execute(query, [db_name])
            
            if not cursor.fetchone():
                # Column doesn't exist, add it
                cursor.execute("ALTER TABLE `paper` ADD COLUMN `accepted_on` datetime(6) NULL;")
                print("[Migration] Added accepted_on column to paper table")
            else:
                print("[Migration] Column accepted_on already exists")
    except Exception as e:
        print("[Migration] Error in add_accepted_on_column: {0}".format(str(e)))
        # Don't fail the migration - column might already exist


def remove_accepted_on_column(apps, schema_editor):
    """Remove accepted_on column if it exists."""
    try:
        with connection.cursor() as cursor:
            # Check if column exists before dropping
            db_settings = connection.settings_dict
            db_name = db_settings.get('NAME', '')
            
            query = """
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA=%s AND TABLE_NAME='paper' AND COLUMN_NAME='accepted_on'
            """
            cursor.execute(query, [db_name])
            
            if cursor.fetchone():
                # Column exists, drop it
                cursor.execute("ALTER TABLE `paper` DROP COLUMN `accepted_on`;")
                print("[Migration] Removed accepted_on column from paper table")
            else:
                print("[Migration] Column accepted_on doesn't exist (nothing to remove)")
    except Exception as e:
        print("[Migration] Error in remove_accepted_on_column: {0}".format(str(e)))
        # Don't fail the migration


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_coauthor_user_invitation"),
    ]

    operations = [
        migrations.RunPython(add_accepted_on_column, remove_accepted_on_column),
    ]
