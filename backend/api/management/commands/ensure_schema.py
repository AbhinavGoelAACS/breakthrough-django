from django.core.management.base import BaseCommand
from django.db import connection


# Define missing columns to add: (table, column, SQL type)
REQUIRED_COLUMNS = [
    ("user", "profile_picture", "VARCHAR(500) NULL"),
    ("paper", "paper_references", "LONGTEXT NULL"),
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

        if added:
            self.stdout.write(self.style.SUCCESS(f"\nDone — {added} column(s) added."))
        else:
            self.stdout.write(self.style.SUCCESS("\nSchema is up to date."))
