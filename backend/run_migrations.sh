#!/bin/bash
# Auto-run migrations script for cPanel deployment
# This script can be called from your deployment hooks or Git post-receive hooks

set -e

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

# Ensure managed=False table columns also match expected schema/encoding
echo "[BreakThrough] Verifying managed=False schema..."
python manage.py ensure_schema

echo "[BreakThrough] ✓ Migrations completed successfully"
exit 0
