#!/bin/bash
# Auto-run migrations script for cPanel deployment
# This script can be called from your deployment hooks or Git post-receive hooks

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment (adjust path as needed for your setup)
VENV_PATH="${SCRIPT_DIR}/venv"
if [ ! -d "$VENV_PATH" ]; then
    VENV_PATH="/home2/aacsjour/virtualenv/BreakThrough/3.10"
fi

if [ -d "$VENV_PATH" ]; then
    source "${VENV_PATH}/bin/activate"
fi

# Change to project directory
cd "$SCRIPT_DIR"

# Run migrations
echo "[BreakThrough] Running database migrations..."
python manage.py migrate api --verbosity 2

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "[BreakThrough] ✓ Migrations completed successfully"
    exit 0
else
    echo "[BreakThrough] ✗ Migration failed - check logs"
    exit 1
fi
