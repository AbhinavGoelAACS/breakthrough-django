# Deployment Guide

## cPanel Deployment via GitHub Actions

This guide explains how to deploy the BreakThrough application to cPanel using GitHub Actions.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Secrets Setup](#github-secrets-setup)
3. [cPanel Configuration](#cpanel-configuration)
4. [Deployment Workflows](#deployment-workflows)
5. [Manual Deployment](#manual-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### cPanel Requirements
- cPanel hosting with:
  - FTP access enabled
  - SSH access (optional, for automated restarts)
  - Python 3.10+ support
  - Node.js support (for building locally)
  - MySQL database

### GitHub Repository
- Repository with Actions enabled
- Admin access to configure secrets

---

## GitHub Secrets Setup

Navigate to your repository: **Settings → Secrets and variables → Actions**

Add the following secrets:

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `FTP_HOST` | FTP server hostname | `ftp.yourdomain.com` |
| `FTP_USERNAME` | FTP username | `username@yourdomain.com` |
| `FTP_PASSWORD` | FTP password | `your_ftp_password` |
| `BACKEND_SERVER_DIR` | Backend deployment path | `/public_html/backend/` |
| `FRONTEND_SERVER_DIR` | Frontend deployment path | `/public_html/` |
| `VITE_API_BASE_URL` | API URL for frontend | `https://api.yourdomain.com/api/v1` |

### Optional Secrets (for SSH post-deployment)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SSH_HOST` | SSH hostname | `yourdomain.com` |
| `SSH_USERNAME` | SSH username | `your_cpanel_username` |
| `SSH_PRIVATE_KEY` | SSH private key content | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SSH_PORT` | SSH port | `22` |
| `BACKEND_PATH` | Absolute path to backend | `/home/username/public_html/backend` |

### How to Add Secrets

1. Go to repository **Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter secret name and value
5. Click **Add secret**

---

## cPanel Configuration

### 1. Create MySQL Database

1. Log into cPanel
2. Go to **MySQL Databases**
3. Create new database: `breakthroughdb`
4. Create database user
5. Add user to database with ALL PRIVILEGES

### 2. Set Up Python Application (Backend)

1. Go to **Setup Python App** in cPanel
2. Click **Create Application**
3. Configure:
   - Python version: `3.10`
   - Application root: `public_html/backend`
   - Application URL: `yourdomain.com/api` or subdomain
   - Application startup file: `passenger_wsgi.py`
   - Application Entry point: `application`
4. Click **Create**
5. Note the virtual environment path

### 3. Configure Backend Environment

1. SSH into your server or use cPanel File Manager
2. Navigate to `public_html/backend`
3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   nano .env
   ```
4. Fill in all required values

### 4. Configure Frontend Domain

1. Frontend files go to `public_html/` (main domain)
2. Or create a subdomain for frontend
3. Ensure `.htaccess` is properly configured for SPA routing

---

## Deployment Workflows

### Automatic Deployment (on push to main)

The workflows trigger automatically when:
- **Backend**: Files in `backend/` are modified
- **Frontend**: Files in `frontend/` are modified

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select the workflow:
   - `Deploy Backend to cPanel`
   - `Deploy Frontend to cPanel`
   - `Deploy Full Application to cPanel`
3. Click **Run workflow**
4. Select branch and options
5. Click **Run workflow**

### Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-backend.yml` | Backend-only deployment |
| `.github/workflows/deploy-frontend.yml` | Frontend-only deployment |
| `.github/workflows/deploy.yml` | Full application deployment |

---

## Directory Structure on cPanel

```
/home/username/
├── public_html/
│   ├── index.html          # Frontend entry
│   ├── assets/             # Frontend static assets
│   ├── .htaccess           # SPA routing rules
│   └── backend/            # Django application
│       ├── api/
│       ├── bp_backend/
│       ├── manage.py
│       ├── passenger_wsgi.py
│       ├── requirements.txt
│       ├── venv/           # Python virtual environment
│       ├── media/          # Uploaded files
│       ├── staticfiles/    # Collected static files
│       └── tmp/
│           └── restart.txt # Touch to restart app
```

---

## Manual Deployment

### Backend Manual Deploy

```bash
# SSH into server
ssh username@yourdomain.com

# Navigate to backend
cd ~/public_html/backend

# Activate virtual environment
source venv/bin/activate

# Pull latest code (if using Git)
git pull origin main

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input

# Restart application
touch tmp/restart.txt
```

### Frontend Manual Deploy

```bash
# On local machine
cd frontend
npm install
npm run build

# Upload dist/ contents to public_html/
# Using FTP client or cPanel File Manager
```

---

## Troubleshooting

### Common Issues

#### 1. FTP Connection Failed
- Verify FTP credentials
- Check if FTP is enabled in cPanel
- Try passive mode
- Check firewall rules

#### 2. Python Application Not Starting
- Check `passenger_wsgi.py` syntax
- Verify virtual environment path
- Check error logs: `~/logs/error.log`
- Ensure all dependencies are installed

#### 3. Frontend 404 Errors
- Verify `.htaccess` is uploaded
- Check `RewriteEngine` is enabled
- Ensure `mod_rewrite` is available

#### 4. Database Connection Failed
- Verify database credentials in `.env`
- Check database user permissions
- Ensure database exists

#### 5. Static Files Not Loading
- Run `python manage.py collectstatic`
- Check `STATIC_ROOT` path
- Verify file permissions

### Checking Logs

```bash
# Application logs
tail -f ~/logs/error.log

# Django logs (if configured)
tail -f ~/public_html/backend/logs/django.log

# Access logs
tail -f ~/logs/access.log
```

### Restart Application

```bash
# Method 1: Touch restart file
touch ~/public_html/backend/tmp/restart.txt

# Method 2: Via cPanel
# Go to Setup Python App → Your App → Restart
```

---

## Security Checklist

- [ ] `.env` file is not in version control
- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] HTTPS enabled for all traffic
- [ ] Database credentials are secure
- [ ] FTP password is strong
- [ ] SSH key-based authentication (if using SSH)
- [ ] CORS origins are restricted
- [ ] File permissions are correct (755 dirs, 644 files)

---

## Automated reviewer reminders

Reminder emails are sent by `api/services/reminders.py`. **No cron job or
server configuration is needed** — `ReminderTickMiddleware` gives the cycle a
chance to run after each response, and the site runs one cycle per hour.

How it stays cheap:

- a per-process timer means only one request every 5 minutes per worker touches
  the database at all;
- that request claims the cycle with a single conditional UPDATE on
  `reminder_cycle_run`, so exactly one worker runs it however many are up;
- the claim holder hands the work to the background email queue that already
  exists in every worker, so nothing is added to the request and no new thread
  is created.

Tune the cadence with `CYCLE_INTERVAL_MINUTES` and `LOCAL_CHECK_SECONDS` in
`api/services/reminder_scheduler.py`.

> **Do not** start a scheduler thread per worker. That is how this ran between
> 3 and 7 July 2026 (`43b3a37`), and on cPanel/CloudLinux the extra thread plus
> a held MySQL connection per worker exceeded the account's LVE process limit —
> workers were SIGTERM-killed and respawned in a loop. Removed in `c9bece1`.

### Running it by hand

The management command still exists for manual runs and previews:

```
python manage.py send_review_reminders --dry-run   # show what would be sent
python manage.py send_review_reminders             # send now, synchronously
```

Sends are throttled per record (`MIN_HOURS_BETWEEN_REMINDERS`), so running it
by hand alongside the automatic cycle cannot produce duplicate emails.

### If you ever do want cron instead

A cPanel cron job works too, but note the mistake that made it silently useless
for about two months: **the schedule and the command go in different fields.**
Pasting a whole crontab line (`0 * * * * /path/to/python ...`) into the Command
box makes cron run a program called `0`, filling the log with
`jailshell: line 1: 0: command not found` and sending nothing. Put `0 * * * *`
in the schedule fields (or pick *Once Per Hour*), and only the command itself
in the Command box. Log outside the application root — the app root is the
document root here, so `<host>/reminders.log` would be downloadable by anyone,
and that log names reviewers and their email addresses.

---

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Review cPanel error logs
3. Verify all secrets are configured correctly
4. Ensure cPanel Python app is properly set up

---

*Last updated: March 2026*


## Migrations on cPanel (no SSH)

This cPanel account has **no SSH access**, so `manage.py migrate` cannot be run
by hand or from the deploy workflow. The deploy pipeline is FTP-only.

Migrations are therefore applied by the application itself, in
`api/apps.py :: ApiConfig.ready()`, which runs when Passenger boots a worker.
The chain is:

1. GitHub Actions rsyncs `backend/` into a package and bakes a fresh
   `tmp/restart.txt` with the current timestamp.
2. FTP uploads the package. The changed `restart.txt` makes Passenger reload
   the app on the next request.
3. On boot, `ApiConfig.ready()` applies any unapplied migrations, then runs
   `ensure_schema` for the legacy `managed = False` tables.

Safeguards, because this runs unattended on every worker boot:

- **Cheap no-op.** One read of `django_migrations`; if nothing is pending it
  returns immediately without taking a lock. Measured at ~0.3s on boot.
- **One migrator.** Workers contend on a non-blocking `flock` at
  `tmp/migrate.lock`. Whichever worker wins migrates; the others skip rather
  than queue, so no worker is held up behind a long migration.
- **Failures do not take the site down.** A migration error is written to
  `stderr.log` and the worker continues booting, so existing endpoints keep
  serving instead of every request failing.
- **Never during management commands.** The hook only fires when `runserver` is
  in `sys.argv` or `passenger_wsgi` is loaded, so `migrate`, `makemigrations`,
  `test` and `shell` are unaffected.

### Checking what happened after a deploy

`stderr.log` in the backend root is the only visibility available without a
console:

```text
[startup] applying migrations: api.0013_bookguesteditor
[startup] migrations applied
```

A `[startup] MIGRATION FAILED: ...` line means the code deployed but the schema
did not change — expect 500s from anything touching the new tables.

### Known failure mode: new routes return 404

If newly added endpoints 404 while existing ones still work, the code did not
reach the running process. That is a *deploy* problem, not a code problem —
Passenger is still serving the old module from memory. Check that the Actions
run succeeded and that `tmp/restart.txt` was uploaded with a new timestamp.
