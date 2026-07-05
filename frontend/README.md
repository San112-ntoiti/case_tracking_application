# Kenya Court Case Tracker — Frontend

React 18 + TailwindCSS v4 single-page application for the Kenya Court Case Tracker.

## Stack
React 18 · React Router 6 · Axios · TailwindCSS v4 · Vite

## Project Structure
```
court-tracker-frontend/
  src/
    api/
      client.js          # Axios instance with JWT auto-refresh interceptors
      endpoints.js        # All API calls grouped by domain (authApi, casesApi, billingApi...)
    auth/
      AuthContext.jsx      # Global session state — user, login, logout, role helpers
    routes/
      RootLayout.jsx        # Navbar + Footer wrapper
      ProtectedRoute.jsx     # Auth + role guard for private routes
    components/
      Navbar.jsx, Footer.jsx, StatusBadge.jsx, Button.jsx, FormField.jsx,
      EmptyState.jsx, Spinner.jsx
      admin/CreateCaseModal.jsx
    pages/
      LandingPage, LoginPage, RegisterPage,
      CaseSearchPage, CaseDetailPage, PricingPage, DashboardPage,
      AdminCasesPage, AdminCaseEditPage, AdminSystemPage, NotFoundPage
    index.css             # Design tokens (Tailwind v4 @theme block)
    App.jsx                # Route table
    main.jsx                # Entry point
```

## Design System
The visual identity is deliberately institutional — this is a judiciary utility tool,
not a marketing site. Color and type tokens live in `src/index.css`:

- **Ink** (`#0F2A4A`) — dominant navy, used for headers and primary actions
- **Brass** (`#C9A227`) — court-seal gold, used sparingly for CTAs and "premium" signals
- **Paper** (`#FAF8F3`) — warm off-white background, evokes a physical case file
- **Ledger green / Brick red / Amber** — status colors for case states

**Signature element**: status badges render as a clipped-corner "case file tab"
(`.tab-badge` class) rather than a generic rounded pill, referencing the physical
manila folder tab — see `StatusBadge.jsx`.

**Typography**: Source Serif 4 for headings (gives the weight of a judgment),
Inter for body/UI text, JetBrains Mono specifically for case numbers (monospacing
prevents misreading similar characters like 0/O in identifiers like `HCCC E001/2025`).

## Quick Start
```bash
npm install
cp .env.example .env          # Set VITE_API_BASE_URL to your backend URL
npm run dev                    # Starts on http://localhost:5173
```

Requires the Django backend running (see ../court-tracker-backend/README.md).

## Build
```bash
npm run build      # Outputs to dist/
npm run preview    # Preview the production build locally
```

## API Contract Verification
Every API call in `src/api/endpoints.js` was checked field-by-field against live
backend responses (not assumed) during development:
- Search results: `count`, `pages`, `next`, `previous`, `results[].{case_number, court_name, status, ...}`
- Case detail: `court.name`, `parties[].{party_name, party_role}`, `documents[].{is_locked, file_url}`, `is_tracked`
- Auth: `access`, `refresh`, `user.{id, email, full_name, role, phone, has_premium}`
- Tracked cases: `results[].case_detail.{case_number, court_name, status, next_hearing_date}`
- Billing: `products[].price` (returned as string, e.g. `"0.00"` — confirmed `Number()` coercion works for the free-plan check)
- Subscription: `active`, `subscription.{product_name, days_remaining}`
- Audit logs: `results[].{actor_email, action, entity_type, before_state, after_state}`

## Key Design Decisions
- **JWT auto-refresh** lives entirely in `api/client.js` via Axios interceptors —
  no component ever has to think about token expiry. A 401 triggers a silent
  refresh-and-retry; if refresh also fails, the session clears and redirects to login.
- **AuthContext** is the single source of truth for role-based UI — `isCourtAdmin`,
  `isSysAdmin`, `hasPremium` are computed once and consumed everywhere (Navbar,
  ProtectedRoute, CaseDetailPage's track button, etc.) rather than re-derived per component.
- **Debounced search** (500ms) in CaseSearchPage matches the wireframe spec from
  the Phase 25 design document — filters auto-apply without a submit button.
- **Free-tier upsell** surfaces inline wherever the 403 from `TrackedCaseListView`
  fires (case detail track button, dashboard banner) rather than failing silently.
- **Mock vs M-Pesa payment** are both first-class options on the checkout screen —
  mock for demoing the e-commerce flow without live Safaricom credentials, real
  STK Push for an actual demonstration if sandbox credentials are configured.

## Pages Implemented (matches Phase 25 wireframe spec)
| Screen | Route | Access |
|---|---|---|
| Landing | `/` | Public |
| Case Search | `/search` | Public |
| Case Detail | `/cases/:id` | Public (tracking requires login) |
| Pricing & Checkout | `/pricing` | Public (checkout requires login) |
| Login / Register | `/login`, `/register` | Public |
| User Dashboard | `/dashboard` | Authenticated |
| Court Admin — Case List | `/admin/cases` | COURT_ADMIN, SYS_ADMIN |
| Court Admin — Case Edit | `/admin/cases/:id` | COURT_ADMIN, SYS_ADMIN |
| System Admin | `/admin/system` | SYS_ADMIN only |

## Next Steps
- Connect to deployed backend URL in production `.env`
- Add unit tests (Vitest + React Testing Library)
- Lighthouse mobile audit pass
- PDF/CSV export wiring for tracked cases report (backend endpoint pending)
