# Railway Deployment Guide for Kenya Court Case Tracker

## Overview
This guide walks you through deploying your Kenya Court Case Tracker to Railway.app.

**Important:** 
- Keep `docker-compose.yml` for local development
- Use `railway-docker-compose.yml` and `.env.production` for Railway
- Do NOT replace your existing setup

---

## Step 1: Prepare Your GitHub Repository

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

Ensure your repo is **public** or grant Railway access to private repos.

---

#### Step 2: Create Railway Account

1. Go to [https://railway.app](https://railway.app/)
2. Click "Start New Project"
3. Sign up with GitHub (recommended) or email
4. Authorize Railway to access your GitHub repositories

---

#### Step 3: Create New Project on Railway

1. Click "+ New Project"
2. Select "Deploy from GitHub repo"
3. Find and select `case_tracking_application`
4. Railway will auto-detect your Dockerfile

---

#### Step 4: Add PostgreSQL Database

1. In Railway dashboard, click "+ Add Service"
2. Search for "PostgreSQL"
3. Click "PostgreSQL" to add
4. Railway auto-creates and provides:
- `PGUSER`
- `PGPASSWORD`
- `PGHOST`
- `PGPORT`
- `DATABASE_URL`
These are **automatically available** in all services.

---

#### Step 5: Add Redis Service

1. Click "+ Add Service"
2. Search for "Redis"
3. Click "Redis" to add
4. Railway provides `REDIS_URL` automatically

---

#### Step 6: Configure API Service Environment Variables
In the Railway dashboard API service:

1. Go to "Variables" tab
2. Add these variables (fill in your actual values):

```
DJANGO_SETTINGS_MODULE=config.settings.production SECRET_KEY=<GENERATE_A_STRONG_SECRET_KEY> DEBUG=False ALLOWED_HOSTS=yourdomain.railway.app,*.railway.app
```
**Then add your 3rd-party API keys:**

```
MPESA_CONSUMER_KEY=<YOUR_KEY> MPESA_CONSUMER_SECRET=<YOUR_SECRET> MPESA_PASSKEY=<YOUR_PASSKEY> SENDGRID_API_KEY=<YOUR_KEY> DEFAULT_FROM_EMAIL=noreply@courttracker.co.ke AFRICASTALKING_USERNAME=sandbox AFRICASTALKING_API_KEY=<YOUR_KEY> TWILIO_ACCOUNT_SID=<YOUR_SID> TWILIO_AUTH_TOKEN=<YOUR_TOKEN> TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

#### Step 7: Set Build & Start Commands
In Railway API service settings:

**Build Command:**

```
pip install -r requirements.txt
```

**Start Command:**

```
python manage.py migrate && python manage.py collectstatic --no-input && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4
```

---

#### Step 8: Deploy

1. Railway automatically deploys when you push to GitHub
2. Watch the build logs in the dashboard
3. Once deployed, you'll see a live URL: `https://case-tracker-xxxx.railway.app`

---

#### Step 9: Deploy Celery Services (Optional but Recommended)
For background tasks:

**Create Celery Worker Service:**

1. Click "+ Add Service" → "GitHub Repo"
2. Select your repo again
3. In Variables, add: `DJANGO_SETTINGS_MODULE=config.settings.production`
4. Start Command:

```
celery -A config worker --loglevel=info --concurrency=4
```

**Create Celery Beat Service:**

1. Click "+ Add Service" → "GitHub Repo"
2. Select your repo again
3. In Variables, add: `DJANGO_SETTINGS_MODULE=config.settings.production`
4. Start Command:

```
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

Both services inherit PostgreSQL and Redis automatically.

---

#### Step 10: Custom Domain (Optional)

1. Go to project settings
2. Add custom domain (e.g., `courtracker.com`)
3. Follow DNS CNAME instructions provided by Railway
4. Update `ALLOWED_HOSTS` in environment variables

---

#### Verify Deployment

##### Check if API is running:

```
curl https://your-railway-url/api/v1/health/
```

##### View logs:

- Railway dashboard → click service → "Logs" tab
- Tail live logs in real-time

##### Check database migrations:

```
curl https://your-railway-url/admin/
```

---

#### Troubleshooting

##### Issue: `ProgrammingError: relation "app_model" does not exist`
**Solution:** Ensure `python manage.py migrate` runs in Start Command (it does by default)

##### Issue: Static files not loading (404 on CSS/JS)
**Solution:**

1. Verify `python manage.py collectstatic` runs in Start Command
2. Check `STATIC_ROOT` in `config/settings/production.py`
3. For production, use S3 or similar cloud storage

##### Issue: Celery tasks not running
**Solution:**

1. Verify `REDIS_URL` is set (Railway provides automatically)
2. Check Celery Worker logs for errors
3. Ensure Celery Beat is running

##### Issue: "Out of memory" errors
**Solution:**

1. Reduce Gunicorn workers: `--workers 2` instead of 4
2. Upgrade Railway plan for more RAM
3. Check for memory leaks in your code

##### Issue: Database connection timeout
**Solution:**

1. Verify PostgreSQL service is running (check Railway dashboard)
2. Confirm `PGHOST`, `PGUSER`, `PGPASSWORD` are set
3. Check `config/settings/production.py` reads from environment variables, not hardcoded localhost

---

#### Local Development (Keep Using Original Setup)
Your local `docker-compose.yml` and `.env` remain **unchanged**:

```
# Local development (still works as before)
docker compose up --build

# Access locally:
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Database: localhost:5432
# Redis: localhost:6379
```

---

#### Summary
EnvironmentFiles UsedDatabaseRedis**Local Dev**`docker-compose.yml` + `.env`ContainerContainer**Railway**`railway-docker-compose.yml` + `.env.production`Railway PostgreSQLRailway Redis
Keep both setups; use the appropriate one for each environment.
