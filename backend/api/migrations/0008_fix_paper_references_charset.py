"""
Ensure paper.paper_references supports full Unicode in MySQL.
"""

from django.db import connection, migrations


def ensure_paper_references_utf8mb4(apps, schema_editor):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT CHARACTER_SET_NAME, COLLATION_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'paper'
                  AND COLUMN_NAME = 'paper_references'
                """
            )
            row = cursor.fetchone()

            if not row:
                cursor.execute(
                    "ALTER TABLE `paper` ADD COLUMN `paper_references` "
                    "LONGTEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
                print("[Migration] Added paper.paper_references as utf8mb4")
                return

            charset_name, collation_name = row
            if charset_name != "utf8mb4" or collation_name != "utf8mb4_unicode_ci":
                cursor.execute(
                    "ALTER TABLE `paper` MODIFY COLUMN `paper_references` "
                    "LONGTEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
                print("[Migration] Updated paper.paper_references to utf8mb4")
            else:
                print("[Migration] paper.paper_references is already utf8mb4")
    except Exception as exc:
        print(f"[Migration] Error in ensure_paper_references_utf8mb4: {exc}")


def noop_reverse(apps, schema_editor):
    # Keep reverse operation non-destructive.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_paper_access_audit_log"),
    ]

    operations = [
        migrations.RunPython(ensure_paper_references_utf8mb4, noop_reverse),
    ]
