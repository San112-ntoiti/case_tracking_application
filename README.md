# Kenya Court Case Tracker

A secure, e-commerce-enabled web platform for searching, tracking, and receiving
notifications on Kenyan judiciary court cases. Built for SIT 033, JKUAT.

## Stack
Django 4.2 + DRF · PostgreSQL 15 · React 18 + TailwindCSS v4 · Celery + Redis · M-Pesa Daraja API

## Project Structure
```
kenya-court-tracker/
  backend/        Django REST API (see backend/README.md)
  frontend/       React SPA (see frontend/README.md)
  docker-compose.yml   Full-stack orchestration (db, redis, api, celery, frontend)
```

## Quick Start (Docker)
```bash
cp backend/.env.example backend/.env    # Fill in real values; defaults work for local dev
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Swagger docs: http://localhost:8000/api/docs/

**Note on verification**: docker-compose.yml has been validated for YAML correctness
and every build-context/Dockerfile path resolves correctly, but a Docker engine was
not available in the development sandbox to run `docker compose up` end-to-end.
The backend and frontend were each verified to work correctly when run independently
(backend against a real local PostgreSQL/Redis, frontend build compiles clean and
every API contract was checked field-by-field against live backend responses — see
backend/README.md and frontend/README.md for the specifics). Run a full `docker
compose up --build` as your first integration step and report back if anything
needs adjusting — the most likely friction point is the `DB_HOST=db` / `REDIS_URL`
hostnames resolving correctly inside the Docker network, which is standard Compose
behaviour but should be confirmed on your machine.

## Demo Credentials
| Role | Email | Password |
|---|---|---|
| System Admin | admin@courttracker.co.ke | Admin@1234 |
| Court Admin | clerk@nairobi.courts.go.ke | Clerk@1234 |
| Advocate | kamau@advocateslaw.co.ke | Advocate@1234 |
| Public User | citizen@gmail.com | Public@1234 |

## What's Been Verified End-to-End
- Full e-commerce flow: search → register → track → hit free-tier limit → subscribe
  (mock or M-Pesa STK Push) → unlimited tracking unlocked
- Court Admin workflow: create case → update status → automatic notification queuing
  to subscribed trackers → audit log capture
- RBAC enforcement across all 4 roles, tested with real 403/404 attack attempts
- 8 OWASP Top 10 categories security-tested with live attack payloads
  (see SIT033_Phase36-37_Testing_Security_Audit.docx)
- Every frontend API call checked against live backend response shapes — not assumed

## Known Limitations (documented, not hidden)
- docker-compose.yml is structurally validated but not run end-to-end (see above)
- M-Pesa integration requires real Safaricom Daraja sandbox credentials to test the
  live STK Push flow; the mock payment endpoint fully demonstrates the e-commerce
  flow without them
- No automated test suite (pytest/Vitest) — testing was done via Django's test client
  exercising real database state, documented in the Phase 36 report, given the 5-day
  delivery window
- PDF/CSV export for tracked cases (FR-37) is specified but not yet implemented

## Documentation Set
1. SIT033_Phase1_Project_Proposal.docx
2. SIT033_Phase2-12_Requirements_Analysis.docx
3. SIT033_Phase13-26_System_Design.docx
4. SIT033_Phase36-37_Testing_Security_Audit.docx
5. This README + backend/README.md + frontend/README.md

## Remaining Phases (38-42)
- Phase 38: Performance optimisation (query profiling, caching strategy)
- Phase 39: Deployment (Render/Railway live deployment)
- Phase 40: User manual
- Phase 41: Technical documentation (this is largely covered by the README set above)
- Phase 42: Presentation preparation
