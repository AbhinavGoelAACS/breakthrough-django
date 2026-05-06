"""
Passenger WSGI Configuration for cPanel Deployment
This file is the entry point for the Python application on cPanel.
"""
import os
import sys
import importlib

# Get the directory where this file is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the project directory to the Python path
sys.path.insert(0, SCRIPT_DIR)

# Passenger runs only in deployed hosting, so default to production mode.
os.environ.setdefault('DJANGO_ENV', 'production')

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

# Load environment variables from production env file (optional).
# This prevents accidental use of development values from backend/.env.
prod_env_path = os.path.join(SCRIPT_DIR, '.env.production')
if os.path.exists(prod_env_path):
    try:
        load_dotenv = importlib.import_module('dotenv').load_dotenv
        load_dotenv(prod_env_path, override=False)
    except ImportError:
        # Don't crash app startup if python-dotenv is missing in production.
        pass
elif os.environ.get('ALLOW_DOTENV_IN_PROD', 'false').strip().lower() == 'true':
    legacy_env_path = os.path.join(SCRIPT_DIR, '.env')
    if os.path.exists(legacy_env_path):
        try:
            load_dotenv = importlib.import_module('dotenv').load_dotenv
            load_dotenv(legacy_env_path, override=False)
        except ImportError:
            pass

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bp_backend.settings')

# Shared hosting often has tight process/thread limits. Keep BLAS backends
# single-threaded so importing scipy/sklearn does not exhaust the limit.
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('MKL_NUM_THREADS', '1')
os.environ.setdefault('NUMEXPR_NUM_THREADS', '1')

# Import Django WSGI application
from bp_backend.wsgi import application
