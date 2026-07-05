# Kenya Court Case Tracker — Backend

Django REST API for the Kenya Court Case Tracker (SIT 033 capstone project, JKUAT).

## Stack
Django 4.2 · Django REST Framework · PostgreSQL 15 · SimpleJWT · Celery + Redis · M-Pesa Daraja

## Project Structure
```
court-tracker-backend/
  config/
    settings/          # base.py, development.py, production.py
    urls.py             # Root URL config (/api/v1/...)
    celery.py           # Celery app instance
    pagination.py        # Standard pagination class
    exceptions.py         # Custom DRF exception handler
  accounts/             # Custom User model, JWT auth, RBAC permissions
  cases/                # Core domain: Court, Case, Party, Advocate, Event, Document, TrackedCase
  billing/              # Product, Order, Subscription, M-Pesa Daraja integration
  notifications/        # Notification queue + Celery dispatch (Email/SMS/WhatsApp)
  audit/                # Append-only AuditLog + middleware + signals
  manage.py
  requirements.txt
  docker-compose.yml
  Dockerfile
  .env.example
```

## Quick Start (Docker — recommended)
```bash
cp .env.example .env          # Fill in your values
docker compose up --build
```
This starts PostgreSQL, Redis, the Django API, Celery worker, and Celery beat.
The API will be available at http://localhost:8000/api/v1/
Swagger docs: http://localhost:8000/api/docs/

## Quick Start (Local, without Docker)
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Set DB_HOST=localhost, REDIS_URL=redis://localhost:6379/0
# Ensure PostgreSQL and Redis are running locally
python manage.py migrate
python manage.py seed_data    # Populates demo courts, users, products, cases
python manage.py runserver
```

## Demo Credentials (after seed_data)
| Role          | Email                          | Password      |
|---------------|---------------------------------|---------------|
| System Admin  | admin@courttracker.co.ke       | Admin@1234    |
| Court Admin   | clerk@nairobi.courts.go.ke     | Clerk@1234    |
| Advocate      | kamau@advocateslaw.co.ke       | Advocate@1234 |
| Public User   | citizen@gmail.com              | Public@1234   |

## Key Design Decisions
- **UUID primary keys** on all main tables prevent sequential ID enumeration.
- **data_source field on Case** allows seamless future integration with a real
  Judiciary API without schema changes — currently all seeded cases are `MANUAL`.
- **Audit logging via Django signals** (cases/signals.py) keeps audit concerns
  out of view logic entirely — every Case/CaseEvent/Document save is logged automatically.
- **Free-tier limit enforcement** lives in `TrackedCaseListView.create()` (cases/views.py),
  implementing Business Rule BR-03 from the design document.
- **M-Pesa Daraja is wrapped in `DarajaService`** (billing/daraja.py) — an adapter
  class so the payment provider can be swapped without touching view logic.
- **Mock payment endpoint** (`/billing/mock/confirm/`) is DEBUG-only and lets the
  full e-commerce flow be demonstrated without live Safaricom credentials.

## Testing the API (no frontend needed yet)
```bash
# Public search
curl "http://localhost:8000/api/v1/cases/?party=Kamau"

# Login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@gmail.com","password":"Public@1234"}'

# Use the returned access token for authenticated requests
curl http://localhost:8000/api/v1/cases/tracked/ \
  -H "Authorization: Bearer <access_token>"
```

## Verified Working (manually tested end-to-end)
- ✅ Public case search with party/advocate/court/judge filters
- ✅ JWT login/register/refresh/logout
- ✅ Free-tier tracked-case limit enforcement (BR-03)
- ✅ Mock payment → order PAID → subscription ACTIVE → premium unlock
- ✅ Court Admin case update → automatic notification queuing to trackers
- ✅ RBAC: Public user blocked (403) from admin endpoints
- ✅ Audit log captures CREATE_CASE / UPDATE_CASE with JSON-safe before/after diffs
- ✅ Revenue report aggregation (System Admin)
- ✅ OpenAPI schema generates cleanly at /api/schema/

## Next Steps (Block C continued)
- React frontend (search, case detail, checkout, dashboards, admin panel)
- Unit + integration test suite (pytest-django)
- Security audit pass (OWASP Top 10 checklist)
- Production deployment to Render
