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

## Automated reviewer reminders (cron)

Reviewer reminder emails are sent by the `send_review_reminders` management
command. **Do not** run them from an in-process server thread — on cPanel/
CloudLinux shared hosting a permanent background thread per Passenger worker
exceeds the LVE process/thread limit and gets the workers SIGTERM-killed in a
boot/kill loop.

Set up a cPanel **Cron Job** (cPanel → Advanced → Cron Jobs), hourly:

```
0 * * * * /home2/aacsjour/virtualenv/prodBTPBknd/3.10/bin/python /home2/aacsjour/prodBTPBknd/manage.py send_review_reminders >> /home2/aacsjour/prodBTPBknd/reminders.log 2>&1
```

Sends are throttled per-record (see `MIN_HOURS_BETWEEN_REMINDERS`), so running
hourly never produces duplicate emails. Preview with `--dry-run`.

---

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Review cPanel error logs
3. Verify all secrets are configured correctly
4. Ensure cPanel Python app is properly set up

---

*Last updated: March 2026*
