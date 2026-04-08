"""
Change assigned_on from DateField to DateTimeField in online_review table.
This allows storing the full timestamp of when reviewers are assigned, not just the date.
"""
from django.db import migrations, connection


def change_assigned_on_to_datetime(apps, schema_editor):
    """Change assigned_on column from DATE to DATETIME(6)."""
    try:
        with connection.cursor() as cursor:
            # Get the database name
            db_settings = connection.settings_dict
            db_name = db_settings.get('NAME', '')
            
            # Check current column type
            query = """
                SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA=%s AND TABLE_NAME='online_review' AND COLUMN_NAME='assigned_on'
            """
            cursor.execute(query, [db_name])
            result = cursor.fetchone()
            
            if result and 'date' in result[0].lower() and 'datetime' not in result[0].lower():
                # Column is DATE, change to DATETIME(6)
                cursor.execute("ALTER TABLE `online_review` MODIFY COLUMN `assigned_on` DATETIME(6) NULL;")
                print("[Migration] Changed assigned_on from DATE to DATETIME(6)")
            elif result and 'datetime' in result[0].lower():
                print("[Migration] Column assigned_on is already DATETIME")
            else:
                print("[Migration] Column assigned_on type unclear: {0}".format(result))
    except Exception as e:
        print("[Migration] Error in change_assigned_on_to_datetime: {0}".format(str(e)))


def revert_assigned_on_to_date(apps, schema_editor):
    """Revert assigned_on column from DATETIME back to DATE if needed."""
    try:
        with connection.cursor() as cursor:
            # This is a reverse operation - rarely used
            cursor.execute("ALTER TABLE `online_review` MODIFY COLUMN `assigned_on` DATE NULL;")
            print("[Migration] Reverted assigned_on from DATETIME to DATE")
    except Exception as e:
        print("[Migration] Error in revert_assigned_on_to_date: {0}".format(str(e)))


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_add_accepted_on"),
    ]

    operations = [
        migrations.RunPython(change_assigned_on_to_datetime, revert_assigned_on_to_date),
    ]
