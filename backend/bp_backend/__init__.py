# Use PyMySQL as MySQLdb for compatibility with cPanel
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

# Monkeypatch django database connection version check to allow MariaDB 10.4
try:
    import django.db.backends.mysql.base
    if hasattr(django.db.backends.mysql.base, 'DatabaseWrapper'):
        django.db.backends.mysql.base.DatabaseWrapper.check_database_version_supported = lambda self: True
        
    import django.db.backends.mysql.features
    if hasattr(django.db.backends.mysql.features, 'DatabaseFeatures'):
        # MariaDB 10.4 does not support RETURNING syntax
        django.db.backends.mysql.features.DatabaseFeatures.can_return_columns_from_insert = False
except Exception:
    pass
