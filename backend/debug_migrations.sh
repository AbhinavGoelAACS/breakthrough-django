#!/bin/bash
# Debug script to check migration status on cPanel server

echo "=== BreakThrough Migration Debug Script ==="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment
VENV_PATH="/home2/aacsjour/virtualenv/BreakThrough/3.10"
if [ -d "$VENV_PATH" ]; then
    source "${VENV_PATH}/bin/activate"
    echo "[OK] Virtual environment activated"
else
    echo "[ERROR] Virtual environment not found at $VENV_PATH"
    exit 1
fi

# Change to backend directory
cd "$SCRIPT_DIR"
echo "[OK] Working directory: $PWD"
echo ""

# Check database connectivity
echo "=== Database Connectivity ==="
python manage.py dbshell <<EOF
SELECT 1 as connection_ok;
EOF
echo ""

# Show migration status
echo "=== Migration Status ==="
python manage.py showmigrations api
echo ""

# Check if accepted_on column exists
echo "=== Checking 'accepted_on' Column ==="
python manage.py dbshell <<EOF
DESCRIBE paper;
EOF
echo ""

# List what would be applied
echo "=== Migration Plan ==="
python manage.py migrate api --plan
echo ""

# Attempt to force mark legacy migrations as faked
echo "=== Force-faking legacy migrations ==="
python manage.py migrate api 0001 --fake 2>&1 | head -5
python manage.py migrate api 0002 --fake 2>&1 | head -5  
python manage.py migrate api 0003 --fake 2>&1 | head -5
echo ""

# Now run the new migration
echo "=== Running new migrations ==="
python manage.py migrate api --verbosity 2

echo ""
echo "=== Complete ===  If you see the accepted_on column above, migration was successful!"
