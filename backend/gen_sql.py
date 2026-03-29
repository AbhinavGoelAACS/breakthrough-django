import os
import django
from django.db import connection
from django.apps import apps

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bp_backend.settings')
django.setup()

api_models = apps.get_app_config('api').get_models()

# Collect SQL using SchemaEditor
# Note: This is a hacky way to get the SQL for unmanaged models
# We collect SQL in a list instead of executing it
with connection.schema_editor(collect_sql=True) as editor:
    for model in api_models:
        # Save original state
        orig_managed = model._meta.managed
        model._meta.managed = True
        try:
            editor.create_model(model)
        finally:
            # Restore original state
            model._meta.managed = orig_managed

# Write the collected SQL to a file
with open('init_db.sql', 'w', encoding='utf-8') as f:
    for sql in editor.collected_sql:
        f.write(sql + ";\n")
print("SQL schema written to init_db.sql")
