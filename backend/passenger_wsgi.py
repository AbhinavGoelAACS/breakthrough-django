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
