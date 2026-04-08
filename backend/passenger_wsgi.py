"""
Passenger WSGI Configuration for cPanel Deployment
This file is the entry point for the Python application on cPanel.
"""
import os
import sys

# Get the directory where this file is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the project directory to the Python path
sys.path.insert(0, SCRIPT_DIR)

# Set up the virtual environment (if exists)
VENV_PATH = os.path.join(SCRIPT_DIR, 'venv')
if os.path.exists(VENV_PATH):
    # Activate virtual environment
    activate_this = os.path.join(VENV_PATH, 'bin', 'activate_this.py')
    if os.path.exists(activate_this):
        exec(open(activate_this).read(), {'__file__': activate_this})
    else:
        # Alternative activation for newer Python versions
        site_packages = os.path.join(VENV_PATH, 'lib', 'python{}.{}'.format(
            sys.version_info.major, sys.version_info.minor), 'site-packages')
        if os.path.exists(site_packages):
            sys.path.insert(0, site_packages)

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = os.path.join(SCRIPT_DIR, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bp_backend.settings')

# Run database migrations automatically on startup
def run_migrations():
    """Run pending database migrations automatically."""
    try:
        import django
        django.setup()
        
        from django.core.management import call_command
        from django.db import connection
        
        # Only run migrations if we can connect to the database
        with connection.cursor() as cursor:
            # Run migrations
            call_command('migrate', 'api', verbosity=0)
            print("[BreakThrough] ✓ Database migrations completed successfully")
    except Exception as e:
        # Log but don't fail - the app might still work or migrations might already be applied
        print(f"[BreakThrough] ⚠ Warning: Migration check failed: {str(e)}")
        # Don't raise - let the app continue

# Run migrations before loading the WSGI application
run_migrations()

# Import Django WSGI application
from bp_backend.wsgi import application
