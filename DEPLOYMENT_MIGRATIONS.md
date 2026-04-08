# Auto-Migration Deployment Guide

This document explains how migrations now run automatically without requiring SSH.

## How It Works

### 1. **Automatic WSGI Startup** (Primary Method - No Action Needed)

The `passenger_wsgi.py` file now runs migrations automatically when the application starts:
- Migrations run silently before the Django WSGI app loads
- Works on every application restart/deployment
- Errors are logged but don't crash the app
- ✅ **This is already enabled - no configuration needed!**

### 2. **Manual Migration Script** (Backup - Optional)

For manual deployments or to verify migrations independently:

```bash
# Make the script executable
chmod +x /path/to/backend/run_migrations.sh

# Run it manually
./run_migrations.sh
```

### 3. **cPanel Git Hooks** (Advanced - Optional)

If using Git for deployment, you can add a post-receive hook:

Create or edit `/home2/aacsjour/repositories/breakthrough.git/hooks/post-receive`:

```bash
#!/bin/bash
DEPLOY_PATH="/home2/aacsjour/public_html/BreakThrough"
VENV_PATH="/home2/aacsjour/virtualenv/BreakThrough/3.10"

source "${VENV_PATH}/bin/activate"
cd "$DEPLOY_PATH/backend"
python manage.py migrate api --verbosity 0

# Optional: Restart Passenger
touch tmp/restart.txt
```

Then make it executable:
```bash
chmod +x hooks/post-receive
```

## Testing

To verify migrations are working:

1. **Check application log**: Look for the migration status message
2. **SSH and verify**: (Optional)
   ```bash
   python manage.py showmigrations api
   ```
3. **Check database**: Verify the `accepted_on` column exists in the `paper` table

## Migration Status

| Migration | Status | Column |
|-----------|--------|--------|
| 0001_initial | Already applied | - |
| 0002_create_copyright_form | Already applied | - |
| 0003_coauthor_user_invitation | Already applied | - |
| **0004_add_accepted_on** | **Will auto-apply** | **accepted_on** |

## Troubleshooting

If migrations don't run automatically:

1. **Check migration status via SSH**:
   ```bash
   cd /home2/aacsjour/BreakThrough/backend
   source /home2/aacsjour/virtualenv/BreakThrough/3.10/bin/activate
   python manage.py showmigrations api
   ```

2. **Manually run migrations with verbose output**:
   ```bash
   python manage.py migrate api --verbosity 2
   ```

3. **Check if column was added**:
   ```bash
   python manage.py dbshell
   DESCRIBE paper;  # Look for 'accepted_on' column
   ```

4. **Fake all legacy migrations and run new ones**:
   ```bash
   # Mark legacy migrations as applied without running them
   python manage.py migrate api 0001 --fake
   python manage.py migrate api 0002 --fake
   python manage.py migrate api 0003 --fake
   
   # Then run the new migration
   python manage.py migrate api 0004
   ```

5. **Force re-run of all migrations**:
   ```bash
   # Clear migration history (CAUTION - only if stuck)
   python manage.py migrate api zero
   python manage.py migrate api --fake-initial
   python manage.py migrate api
   ```

## What Changed

- ✅ `passenger_wsgi.py` - Added auto-migration logic
- ✅ `run_migrations.sh` - Created as backup script
- ✅ Migration file `0004_add_accepted_on.py` - Already exists and ready to apply

**No SSH required - migrations will run automatically on your next deployment!**
