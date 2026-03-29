import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bp_backend.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SHOW DATABASES;")
    for row in cursor.fetchall():
        print("DATABASE:", row[0])
