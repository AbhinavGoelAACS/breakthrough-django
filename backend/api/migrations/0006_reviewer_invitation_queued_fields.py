"""
Add auto_assign and for_version columns to reviewer_invitation table.
These support queued reviewer pre-assignments during editor decision flow.

Both columns already exist on servers whose schema was changed outside Django,
so each ALTER is guarded by an INFORMATION_SCHEMA lookup — the same pattern
0004 onwards use. A bare ALTER raised (1060, "Duplicate column name
'auto_assign'") on dev, and one failed operation aborts the whole `migrate`
run, so it also stopped 0007-0014 from applying.
"""
from django.db import migrations, connection


COLUMNS = [
    ("auto_assign", "tinyint(1) NOT NULL DEFAULT 0"),
    ("for_version", "int NULL"),
]

TABLE = "reviewer_invitation"


def _column_exists(cursor, column):
    cursor.execute(
        """
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s
        """,
        [connection.settings_dict.get("NAME", ""), TABLE, column],
    )
    return cursor.fetchone() is not None


def add_columns(apps, schema_editor):
    for column, definition in COLUMNS:
        try:
            with connection.cursor() as cursor:
                if _column_exists(cursor, column):
                    print("[Migration] Column {0}.{1} already exists".format(TABLE, column))
                    continue
                cursor.execute(
                    "ALTER TABLE `{0}` ADD COLUMN `{1}` {2};".format(TABLE, column, definition)
                )
                print("[Migration] Added {0} column to {1} table".format(column, TABLE))
        except Exception as exc:
            print("[Migration] Error adding {0}.{1}: {2}".format(TABLE, column, exc))


def remove_columns(apps, schema_editor):
    for column, _ in reversed(COLUMNS):
        try:
            with connection.cursor() as cursor:
                if not _column_exists(cursor, column):
                    print("[Migration] Column {0}.{1} doesn't exist (nothing to remove)".format(TABLE, column))
                    continue
                cursor.execute("ALTER TABLE `{0}` DROP COLUMN `{1}`;".format(TABLE, column))
                print("[Migration] Removed {0} column from {1} table".format(column, TABLE))
        except Exception as exc:
            print("[Migration] Error removing {0}.{1}: {2}".format(TABLE, column, exc))


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_change_assigned_on_datetime"),
    ]

    operations = [
        migrations.RunPython(add_columns, remove_columns),
    ]
