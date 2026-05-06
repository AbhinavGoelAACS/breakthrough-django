from django.core.management.base import BaseCommand
from django.db import connection


# Define missing columns to add: (table, column, SQL type)
REQUIRED_COLUMNS = [
    ("user", "profile_picture", "VARCHAR(500) NULL"),
    ("paper", "paper_references", "LONGTEXT NULL"),
]

# For existing deployments, normalize text columns to utf8mb4 so Unicode input
# (for example Turkish characters) does not fail during inserts.
REQUIRED_COLUMN_ALTERS = [
    ("paper", "paper_references", "LONGTEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"),
]


class Command(BaseCommand):
    help = "Ensures all required columns exist in the database (for managed=False models)."

    def handle(self, *args, **options):
        added = 0
        with connection.cursor() as cursor:
            for table, column, col_type in REQUIRED_COLUMNS:
                cursor.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    [table, column],
                )
                exists = cursor.fetchone()[0]
                if not exists:
                    sql = f"ALTER TABLE `{table}` ADD COLUMN `{column}` {col_type}"
                    cursor.execute(sql)
                    self.stdout.write(self.style.SUCCESS(f"  Added {table}.{column}"))
                    added += 1
                else:
                    self.stdout.write(f"  OK {table}.{column} (already exists)")

            for table, column, col_type in REQUIRED_COLUMN_ALTERS:
                cursor.execute(
                    "SELECT CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    [table, column],
                )
                row = cursor.fetchone()
                if not row:
                    self.stdout.write(f"  Skip {table}.{column} (column not found)")
                    continue

                charset_name, collation_name = row
                if charset_name != "utf8mb4" or collation_name != "utf8mb4_unicode_ci":
                    sql = f"ALTER TABLE `{table}` MODIFY COLUMN `{column}` {col_type}"
                    cursor.execute(sql)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Updated {table}.{column} to utf8mb4/utf8mb4_unicode_ci"
                        )
                    )
                else:
                    self.stdout.write(f"  OK {table}.{column} charset/collation")

        if added:
            self.stdout.write(self.style.SUCCESS(f"\nDone — {added} column(s) added."))
        else:
            self.stdout.write(self.style.SUCCESS("\nSchema is up to date."))
