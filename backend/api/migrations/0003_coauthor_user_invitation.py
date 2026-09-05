"""
Add user_id and invitation_token columns to paper_co_author table.

Both columns already exist on servers where the schema was built from
init_db.sql rather than by Django, so each ALTER is guarded by a lookup in
INFORMATION_SCHEMA — the same pattern 0004 onwards use. A plain ALTER raised
(1060, "Duplicate column name 'user_id'") on production, and because one failed
operation aborts the whole `migrate` run, that stopped every later migration
from applying too.
"""
from django.db import migrations, connection


COLUMNS = [
    ("user_id", "integer NULL AFTER `paper_id`"),
    ("invitation_token", "varchar(255) NULL AFTER `is_corresponding`"),
]

TABLE = "paper_co_author"


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
            # Matches the surrounding migrations: a column that is already there
            # in a form we did not predict must not block everything after this.
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
        ("api", "0002_create_copyright_form"),
    ]

    operations = [
        migrations.RunPython(add_columns, remove_columns),
    ]
