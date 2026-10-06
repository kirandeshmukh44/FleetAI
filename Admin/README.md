# FleetAI — Admin Panel

A standalone administration console for the **AI-Based Smart Transportation & Fleet
Management Platform**. It is a separate Flask + React application that operates on the
**same database** as the main FleetAI backend, so an administrator sees and manages data
across *every* tenant rather than a single user's workspace.

```
Main FleetAI app                     Admin panel
frontend/  :5174  ──┐                frontend/  :5175
                     ├──►  backend/instance/fleet_management.db  ◄──  backend/ :5001
backend/   :5000  ──┘                (one shared SQLite database)
```

---

## Table of contents

1. [What makes this an admin panel](#what-makes-this-an-admin-panel)
2. [Quick start](#quick-start)
3. [Project structure](#project-structure)
4. [Architecture & the shared database](#architecture--the-shared-database)
5. [Security model](#security-model)
6. [Features](#features)
7. [API reference](#api-reference)
8. [Testing](#testing)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## What makes this an admin panel

| Capability | Main FleetAI app | This admin panel |
|---|---|---|
| Data scope | Only records where `user_id` = you | **Every user, vehicle, driver, journey** |
| Users | Manage your own profile | Create, edit, **delete any account**, change roles |
| Vehicles / Drivers | Create for yourself | **Administrative override** on any record |
| Audit trail | None | Every privileged action is recorded |
| Notifications | None | Operator alerts + automated health sweeps |
| Settings | Per-user | Platform-wide runtime settings |

---

## Quick start

### Prerequisites
- Python 3.12 with the project's `venv` activated
- Node.js 18+

### 1. Install dependencies and configure secrets

```bash
pip install -r requirements.txt
cd Admin/backend
copy .env.example .env          # Windows
# cp .env.example .env          # Linux / macOS
```

**Create your superadmin account** (required on first run):

```bash
python seed_admin.py
# or specify your own credentials:
python seed_admin.py --username opsadmin --email ops@fleetai.com --password 'S3curePass!'
```

### 2. Build and run the production service

```bash
cd ../frontend
npm install
npm run build
cd ../..
python Admin/run.py
# → http://localhost:5001
```

After the initial frontend build, the Admin module runs with one command:

```bash
python Admin/run.py
```

This is the production entry point. Waitress serves the built React application
and Flask API from the same origin; no Vite development server is required.
Set `ADMIN_HOST` and `ADMIN_PORT` to change the bind address.

### 3. Sign in

Open **http://localhost:5001** and use the superadmin credentials you created.


---

## Project structure

```
Admin/
├── backend/                     # Flask admin API (port 5001)
│   ├── bootstrap.py             # Puts the main backend/ on sys.path
│   ├── config.py                # Resolves the shared database + roles
│   ├── admin_app.py             # Application factory & blueprint registration
│   ├── models.py                # Admin-only tables (audit, settings, alerts)
│   ├── utils.py                 # admin_required decorator, pagination, audit
│   ├── routes/
│   │   ├── auth.py              # Sign-in, session, password rotation
│   │   ├── overview.py          # Platform-wide analytics & trends
│   │   ├── users.py             # User CRUD + audit log listing
│   │   ├── fleet.py             # Vehicle & driver oversight
│   │   └── system.py            # Health, settings, notifications
│   ├── run.py                   # Entry point
│   ├── seed_admin.py            # Create/promote a superadmin
│   ├── smoke_test.py            # In-process API tests
│   ├── integration_check.py     # Live end-to-end tests
│   ├── check_views.py           # Static check: every view returns a response
│   └── requirements.txt
│
└── frontend/                    # React admin console (port 5175)
    └── src/
        ├── App.jsx              # Routes + ProtectedRoute
        ├── layouts/AdminLayout.jsx
        ├── context/AuthContext.jsx
        ├── services/api.js      # Axios instance + 401 handling
        ├── hooks/useAdminList.js
        ├── components/          # Modal, DataTable, Badge, Pagination, …
        ├── pages/               # Overview, Users, Vehicles, Drivers,
        │                        # Risk, Audit, System, Login
        └── index.css            # Design system (mirrors the main app palette)
```

---

## Architecture & the shared database

The admin panel is a **separate service**, but it does **not** duplicate the schema.

`bootstrap.py` inserts the main `backend/` directory into `sys.path`, so the admin app
imports the real project modules:

```python
from app.database.db import db   # the same SQLAlchemy instance
from app.models import User, Vehicle, Driver, ...
from app.utils.validation import USERNAME_RE, VEHICLE_ID_RE, ...
```

`config.py` then resolves the database to the exact file the main backend uses:

```python
MAIN_DATABASE_PATH = <project>/backend/instance/fleet_management.db
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + MAIN_DATABASE_PATH
```

**Consequence:** one SQLite file holds both schemas.

| Table | Owner |
|---|---|
| `users`, `vehicles`, `drivers`, `journeys`, `gps_records`, `fuel_records`, `driver_behavior`, `risk_predictions` | main app |
| `admin_audit_logs`, `admin_system_settings`, `admin_notifications` | admin panel |

The admin panel only ever *creates* its own `admin_*` tables; existing tables are reused
untouched, so both services can run at the same time.

---

## Security model

> **Why a separate `superadmin` role?**
>
> The main app's public `POST /api/auth/register` endpoint assigns `role='admin'` to
> **every** new signup. If the admin panel accepted that role, any anonymous visitor
> could self-register on the main frontend and then sign in to the admin console.
>
> To close that privilege-escalation path, the panel requires `role == 'superadmin'`
> specifically, and only `seed_admin.py` can grant it.

Controls in place:

| Control | Behaviour |
|---|---|
| Token type claim | Admin JWTs carry `token_type: 'admin'`; a main-app token is rejected with 401 |
| Live role check | The role is re-verified against the database on **every** request, so revoking access takes effect immediately |
| Last-superadmin guard | The final `superadmin` cannot be demoted or deleted (prevents lockout) |
| Self-delete guard | You cannot delete the account you are signed in with |
| Input validation | Every write validates against the same regexes the main app uses |
| Unknown-field rejection | `PUT` endpoints reject unrecognised fields instead of silently ignoring them |
| Audit trail | Every privileged action is written to `admin_audit_logs` (best-effort, never blocks the request) |
| CORS | Locked to the admin frontend origin(s) from `ADMIN_FRONTEND_URL` |

> The main FleetAI backend (`backend/run.py`, port 5000) does **not** need to be running

---

## Features

### Platform Overview
Eight KPI tiles (users, vehicles, drivers, journeys, high-risk counts, fuel efficiency,
distance, spend), a 30-day activity bar chart, vehicle-status and driver-risk donut
charts, open operator alerts, and a highest-mileage leaderboard.

### User Governance
Search, filter by role, paginate. Create accounts, change roles, reset passwords, delete
users. Deleting a user **cascades** to the vehicles, drivers and journeys they own.
The table shows each user's owned resource counts.

### Fleet Oversight — Vehicles
Cross-tenant vehicle list with status, risk level, fuel gauge, trip count and last-GPS
freshness. Admins can correct registration data, override status/risk, and delete
vehicles (cascading journeys, GPS pings, fuel records, behaviour events, predictions).
A detail modal shows recent journeys and risk predictions.

### Fleet Oversight — Drivers
Driver list with contact info, owner, vehicle assignment, risk score gauge and licence
expiry. Admins can edit records and delete drivers. A detail modal shows recent risk
predictions and behaviour events.

### Risk Intelligence
Aggregated ML predictions by risk level and by model, plus raw behaviour-event counts
(harsh braking, harsh acceleration, speeding).

### Audit Log
Paginated, filterable history of every privileged action — actor, action, target, and a
JSON detail payload.

### System
Runtime environment info, database row counts, editable platform settings
(`platform_name`, `alerts_high_risk_threshold`, `maintenance_mode`,
`session_timeout_minutes`, `notify_on_new_superadmin`), a **health check** that raises
notifications for stale telemetry and expired licences, and password rotation.

---

## API reference

Base URL: `http://localhost:5001/api/admin`
All routes except `/auth/login` and `/system/health` require
`Authorization: Bearer <admin_token>`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Sign in (superadmin only) |
| GET | `/auth/me` | Current session identity |
| PUT | `/auth/password` | Change your own password |
| GET | `/auth/sessions` | Recent admin sign-ins (from audit log) |

### Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview/stats` | KPIs, status/risk distributions, 7-day activity |
| GET | `/overview/trends` | 30-day daily series (journeys, drivers, vehicles) |
| GET | `/overview/top-vehicles` | Highest-mileage leaderboard |
| GET | `/overview/risk-breakdown` | Predictions by level/model + behaviour events |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/` | Paginated list (`?page=&per_page=&search=&role=`) |
| POST | `/users/` | Create a user |

### Response conventions
Paginated endpoints return:
```json
{ "items": [...], "total": 42, "page": 1, "per_page": 15,
  "pages": 3, "has_next": true, "has_prev": false }
```
Errors return `{ "error": "Human readable message" }` with a 4xx/5xx status.

---

## Testing

Three layers, all runnable:

```bash
cd Admin/backend

# 1. Static: every route view returns a response on all paths
python check_views.py

# 2. In-process: full API test against the real shared database
python smoke_test.py          # 52 assertions

# 3. Live end-to-end: requires both servers running
python integration_check.py   # 28 assertions
```

Frontend:

```bash
cd Admin/frontend
node check-pages.mjs          # every page parses via Vite's transform
npm run lint                  # oxlint
npm run build                 # production build
```

---

## Configuration

`Admin/backend/.env` (copy from `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | *(auto)* | Shared SQLite path. Bare `sqlite:///name.db` resolves against the main backend's `instance/` folder. |
| `SECRET_KEY` | dev fallback | Flask secret |
| `JWT_SECRET_KEY` | dev fallback | Admin token signing key |
| `JWT_ACCESS_TOKEN_EXPIRES` | `28800` | Session lifetime in seconds (default 8h) |
| `ADMIN_FRONTEND_URL` | `http://localhost:5175` | Comma-separated CORS origins |
| `FLASK_ENV` | `development` | Flask environment |

Frontend dev server port and API proxy target live in `Admin/frontend/vite.config.js`.

---

## Troubleshooting

**"This account does not have administrator access" (403)**
The account exists but its role is not `superadmin`. Fix it:
```bash
cd Admin/backend
python seed_admin.py --username <name> --email <email>
```

**"Admin token required" (401) on an otherwise valid login**
You are sending a main-app token. The admin panel issues its own tokens; sign in
through the admin console.

**"Invalid token identity" / tables missing at startup**
The main database has not been created yet:
```bash
cd backend && python init_db.py
```

**Database appears empty in the admin panel**
`DATABASE_URL` is pointing somewhere else. Delete `Admin/backend/.env` to fall back to
auto-resolution of `<project>/backend/instance/fleet_management.db`, or check
*System → Runtime Environment → Database file*.

**"At least one superadmin must remain"**
Working as designed — the last `superadmin` cannot be demoted or deleted. Promote
another account first.

**Port 5001 or 5175 already in use**
Change `PORT` in `admin_app.py` (and the Vite proxy target), or `server.port` in
`vite.config.js`.

**CORS errors in the browser console**
Add your frontend origin to `ADMIN_FRONTEND_URL` in `.env` and restart the API.

---

Built with React 19, Vite, Tailwind CSS v4, Flask and SQLAlchemy —
*FleetAI Admin Console*

| GET | `/users/<id>` | User detail with resource counts |
| PUT | `/users/<id>` | Update username/email/name/role/password |
| DELETE | `/users/<id>` | Delete user **and all owned records** |
| GET | `/users/audit-logs` | Paginated audit trail |

### Fleet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fleet/vehicles` | List (`?status=&risk_level=&vehicle_type=&user_id=`) |
| GET | `/fleet/vehicles/<id>` | Detail with journeys + predictions |
| PUT | `/fleet/vehicles/<id>` | Administrative override |
| DELETE | `/fleet/vehicles/<id>` | Delete vehicle + all its records |
| GET | `/fleet/drivers` | List (`?status=&risk_level=&user_id=`) |
| GET | `/fleet/drivers/<id>` | Detail with predictions + behaviour |
| PUT | `/fleet/drivers/<id>` | Administrative override |
| DELETE | `/fleet/drivers/<id>` | Delete driver + all their records |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/system/health` | Liveness probe (public) |
| GET | `/system/info` | Runtime metadata + table row counts |
| GET | `/system/settings` | Platform settings |
| PUT | `/system/settings/<key>` | Update a setting (type-validated) |
| GET | `/system/notifications` | Operator alerts |
| POST | `/system/notifications` | Raise an alert |
| POST | `/system/notifications/<id>/resolve` | Resolve an alert |
| POST | `/system/check` | Run a health sweep |

> for the admin panel — but the database file must exist. Run
> `python backend/init_db.py` first if this is a brand-new checkout.

### Default credentials

`seed_admin.py` creates:

| Username | Password | Role |
|---|---|---|
| `superadmin` | `admin123` | `superadmin` |

**Change this immediately** in production via *System → Change password*.
