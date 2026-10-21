# Newtonite Operations — Operations Under Pressure

An internal incident and operational work coordination platform built for high-pressure operations. Coordinates customer issues, engineering investigations, billing discrepancies, production incidents, compliance requests, and managerial approvals with strict data consistency, optimistic concurrency control, and request deduplication.

---

## 1. Product Overview

Newtonite Operations replaces fragmented email threads, chat channels, and spreadsheets with a centralized, reliable system of record. It provides:
- **Reliable Work Coordination**: Single source of truth for operational work items with unique keys (`NEWT-1001`), descriptions, reasons, categories, priorities, teams, and assignees.
- **Strict Multi-Team Authorization**: Resource-level security ensures members only view and modify work in authorized teams, while administrators maintain global oversight.
- **Workflow & Approval Integrity**: Server-enforced state machine requiring Manager or Administrator authorization for sensitive transitions (e.g. approving items in `awaiting_approval`).
- **Atomic Optimistic Concurrency Control (OCC)**: Version-checked atomic database updates prevent lost updates and stale writes under concurrent editing.
- **Idempotent Request Handling**: Request deduplication via `Idempotency-Key` headers, payload fingerprinting, and mismatch conflict detection.
- **Durable Audit Trail**: Atomic dual-write audit logs for all critical state changes, assignment shifts, and collaboration comments.
- **Operational Command Dashboard**: Real-time aggregation of total open items, critical issues, overdue tasks, blocked items, and items pending approval.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.11+ / 3.15, FastAPI, Pydantic v2, Pydantic-Settings.
- **Database & ORM**: PostgreSQL 16 (production & Docker) / SQLite WAL mode (zero-dependency local testing), SQLAlchemy 2.x, Alembic.
- **Security**: JWT Access Tokens (HS256 via PyJWT), Bcrypt password hashing.
- **Testing**: Pytest, FastAPI TestClient, HTTPX.
- **Infrastructure**: Docker, Docker Compose, Nginx Alpine.

---

## 3. High-Level Architecture

Newtonite Operations is designed as a **Modular Monolith**:
```
backend/
  app/
    api/v1/          # Versioned REST endpoints (auth, work-items, teams, comments, etc.)
    core/            # Security (bcrypt, JWT) and settings configuration
    db/              # Database engine, sessionmaker, and seed script
    models/          # SQLAlchemy 2.x declarative models
    schemas/         # Pydantic v2 request and response contracts
    services/        # Domain logic, concurrency checks, workflow rules, audit logs
    main.py          # Application entrypoint with lifespan events and CORS
  alembic/           # Database migration versions
  tests/             # Automated test suite (27 passing tests)
  requirements.txt   # Pinned Python dependencies

frontend/
  src/
    api/             # Typed API client with automatic token & conflict handling
    components/      # StatusBadge, PriorityBadge, CreateWorkItemModal, WorkItemDetailModal, Navbar
    pages/           # DashboardPage, WorkItemsPage, TeamsPage, AdminUsersPage, AuditLogPage, LoginPage
    types/           # TypeScript domain definitions
    App.tsx          # Root routing and global modal state
  package.json       # Frontend dependencies and build scripts
  vite.config.ts     # Vite bundler configuration with API proxy

infra/
  Dockerfile.backend # Python 3.11-slim container with health check
  Dockerfile.frontend# Multi-stage Node builder & Nginx Alpine runner
  docker-compose.yml # PostgreSQL, Backend, and Frontend service definitions
  nginx.conf         # Reverse proxy configuration
```

---

## 4. Prerequisites

- **Option A (Docker - Recommended for production testing)**:
  - Docker Desktop 4.x+ or Docker Engine with Docker Compose v2.
- **Option B (Local Bare-Metal Development)**:
  - Python 3.11+ (Python 3.15 supported).
  - Node.js 18+ and npm.

---

## 5. Quick Start

### Method 1: Using Docker Compose (Full Stack with PostgreSQL)

1. Clone or extract the repository.
2. Build and launch all containers:
   ```bash
   docker compose up --build
   ```
3. The services will start in dependency order:
   - PostgreSQL starts and passes health checks.
   - Backend automatically applies Alembic migrations, seeds demo data, and passes health check.
   - Frontend starts behind Nginx on port `5173`.
4. Open your browser:
   - **Frontend Application**: `http://localhost:5173`
   - **Interactive API Documentation (Swagger)**: `http://localhost:8000/api/v1/docs`
   - **API Health Check**: `http://localhost:8000/api/v1/health`

---

### Method 2: Local Development (Automated Scripts)

#### On Windows (PowerShell / CMD)
```powershell
# 1. Run automated setup (creates .venv, installs dependencies, seeds database, builds frontend):
.\setup.ps1
# (or in CMD: setup.bat)

# 2. Launch both backend and frontend:
.\run.ps1
# (or in CMD: run.bat)
```

#### On Linux / macOS (Bash)
```bash
chmod +x setup.sh run.sh
./setup.sh
./run.sh
```

---

### Method 3: Manual Step-by-Step Local Setup

#### Step 1: Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Migrate schema using Alembic
cd backend
alembic upgrade head

# Seed realistic development data
python -m app.db.seed

# Start backend API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 2: Frontend Setup (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Demo Accounts & Seed Data

The development database comes pre-seeded with 7 realistic personas covering distinct roles and teams.

**Default password for all accounts:** `NewtoniteDemo2026!`

| Name | Email | System Role | Assigned Team | Team Role |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Chen** | `admin@newtonite.internal` | `admin` | Global Oversight | Administrator |
| **Marcus Vance** | `manager.eng@newtonite.internal` | `manager` | Core Engineering | Manager |
| **Elena Rostova** | `manager.ops@newtonite.internal` | `manager` | Customer Support & Payments | Manager |
| **Alex Rivera** | `alex.dev@newtonite.internal` | `member` | Core Engineering | Member |
| **Priya Sharma** | `priya.dev@newtonite.internal` | `member` | Engineering & Payments | Member |
| **Carlos Mendez** | `carlos.ops@newtonite.internal` | `member` | Customer Support | Member |
| **Dana Kim** | `dana.compliance@newtonite.internal` | `manager` | Compliance & Legal | Manager |

> **Tip:** The web application features a **1-Click Assessment Personas** selector on both the login screen and the top navigation bar. You can switch between roles in one click to test cross-team authorization without retyping passwords.

---

## 7. Automated Testing

The backend includes a comprehensive automated test suite with **27 passing unit and integration tests** verifying critical correctness guarantees.

To execute tests:
```powershell
$env:PYTHONPATH = "d:\hewlett-assessment\backend"
.\.venv\Scripts\pytest.exe -v
```

### Verified Test Areas:
1. **Optimistic Concurrency Control (`test_concurrency.py`)**:
   - `test_stale_update_rejected_with_conflict`: Rejects stale edits with `HTTP 409 Conflict`.
   - `test_concurrent_updates_race_condition_protection`: Fires 5 simultaneous competing threads against the same item; verifies exactly 1 succeeds and 4 receive 409 Conflict.
2. **Idempotency Protection (`test_idempotency.py`)**:
   - `test_idempotent_creation_success_and_replay`: Retrying creation with the same `Idempotency-Key` returns the cached item with `HTTP 201` and `X-Cache: IDEMPOTENT-HIT`, creating zero duplicate database records.
   - `test_idempotency_key_payload_mismatch_conflict`: Reusing a key with a different request body returns `HTTP 409 Conflict`.
3. **Resource-Level Authorization (`test_authorization.py`)**:
   - `test_cross_team_read_forbidden`: Member of Team B cannot read work belonging to Team A (`403 Forbidden`).
   - `test_cross_team_update_forbidden`: Cross-team updates rejected (`403 Forbidden`).
   - `test_cross_team_comment_forbidden`: Cross-team comments rejected (`403 Forbidden`).
   - `test_assign_to_user_outside_team_rejected`: Reassigning to a user outside the team returns `400 Bad Request`.
   - `test_privilege_escalation_role_update_forbidden`: Ordinary users cannot modify system roles (`403 Forbidden`).
   - `test_admin_has_global_oversight`: Administrators have full visibility across teams.
4. **Workflow & Approval Integrity (`test_workflow.py`)**:
   - `test_invalid_status_transition_rejected`: Invalid status jump (e.g. `open` -> `resolved`) returns `422 Unprocessable Content`.
   - `test_workflow_progression_and_approval_enforcement`: Regular members cannot approve items in `awaiting_approval` (`403 Forbidden`); Team Managers can approve and resolve (`200 OK`), logging an `approved` audit record.
5. **Audit Trail Atomicity (`test_audit_transaction.py`)**:
   - `test_audit_records_persisted_for_mutations`: Creation, comments, and transitions generate corresponding audit entries.
   - `test_failed_and_unauthorized_mutations_create_no_audit`: Failed or forbidden mutations do not create ghost audit entries.
6. **Authentication & Profile (`test_auth.py`)**:
   - Registration, login, invalid credentials, malformed JWTs, and secure administrator bootstrap.
7. **Dashboard & Search (`test_dashboard_and_search.py`)**:
   - Server-side filtering, keyword search, bounded pagination, and aggregated status counts.

---

## 8. Critical Correctness Behaviors

### 1. Atomic Optimistic Concurrency Control (OCC)
- Every work item tracks an integer `version`.
- All updates execute atomic SQL:
  ```sql
  UPDATE work_items 
  SET title = :title, version = version + 1, updated_at = :now 
  WHERE id = :id AND version = :expected_version;
  ```
- If another request has incremented `version`, `rowcount == 0` triggers an immediate `HTTP 409 Conflict` containing the current database version.
- The UI catches HTTP 409 and prompts the operator with a conflict banner and 1-click reload button.

### 2. Idempotent Request Deduplication
- Clients send an `Idempotency-Key: <uuid>` header on `POST /api/v1/work-items`.
- The server stores the SHA-256 fingerprint of the JSON payload.
- Replaying the identical request returns the cached item with `HTTP 201` and `X-Cache: IDEMPOTENT-HIT`.
- Sending a different payload with an existing key returns `HTTP 409 Conflict`.

### 3. Workflow State Machine & Approval Enforcement
Allowed transitions:
- `open` -> `in_progress`, `blocked`, `awaiting_approval`, `closed`
- `in_progress` -> `blocked`, `awaiting_approval`, `resolved`, `closed`
- `blocked` -> `in_progress`, `open`, `closed`
- `awaiting_approval` -> `in_progress`, `resolved`, `open`, `closed` (*Requires Team Manager or Admin*)
- `resolved` -> `closed`, `open`
- `closed` -> `open` (*Requires Team Manager or Admin*)

### 4. Transaction-Consistent Durable Audit Logs
- Domain mutations and audit events commit inside the exact same database transaction.
- If an audit record write fails, the entire transaction rolls back.
- Audit history is strictly append-only.

---

## 9. Secure First-Administrator Bootstrap

To prevent public privilege escalation endpoints while allowing initial system deployment:
1. When no administrators exist, the bootstrap endpoint is active:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/bootstrap-admin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "sarah.admin@newtonite.internal",
       "full_name": "Sarah Chen",
       "password": "SecureAdminPassword123!",
       "bootstrap_secret": "newtonite-initial-bootstrap-secret-key-2026"
     }'
   ```
2. Once the first administrator is created, this endpoint is **permanently disabled** (returns `HTTP 400 Bad Request` on any subsequent attempts).
3. All subsequent role assignments can only be made by an authenticated administrator via `PATCH /api/v1/users/{id}/role`.

---

## 10. Example API Requests

### 1. Authenticate (Login)
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager.eng@newtonite.internal", "password": "NewtoniteDemo2026!"}'
```

### 2. Create Work Item with Idempotency Key
```bash
curl -X POST http://localhost:8000/api/v1/work-items \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database connection pool exhaustion",
    "description": "Connection pool saturated during peak traffic window.",
    "reason": "Prevent service outage on checkout API.",
    "category": "production_incident",
    "priority": "critical",
    "team_id": "<TEAM_UUID>"
  }'
```

### 3. Update Item with Optimistic Concurrency Guard
```bash
curl -X PATCH http://localhost:8000/api/v1/work-items/<ITEM_UUID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database connection pool exhaustion - Resolved via pooling config",
    "version": 1
  }'
```

### 4. Transition Status (e.g. Approve Item)
```bash
curl -X POST http://localhost:8000/api/v1/work-items/<ITEM_UUID>/transition \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "version": 2,
    "note": "Verified root cause fix and validated metrics. Approved."
  }'
```

---

## 11. Security Considerations

- **Password Storage**: Passwords hashed using Bcrypt with 12 rounds of salt.
- **JWT Cryptography**: Signed using HMAC-SHA256 (`HS256`) with a 64-character minimum cryptographic secret key.
- **Input Validation**: Strict schema enforcement and sanitization via Pydantic v2.
- **SQL Injection Prevention**: All queries execute via SQLAlchemy 2.x parameterized statements and ORM expressions.
- **CORS Protection**: Restricted to configured trusted origins (`BACKEND_CORS_ORIGINS`).
- **XSS Prevention**: React automatically escapes untrusted descriptions and comments during JSX rendering.
- **Error Obfuscation**: Production API returns sanitized error responses without leaking internal stack traces.

---

## 12. Known Limitations

1. **Full-Text Search Engine**: Search currently relies on indexed SQL `ILIKE` across `key`, `title`, and `description`. For hundreds of thousands of items, migrating to PostgreSQL `tsvector` with GIN indexes or OpenSearch would be optimal.
2. **WebSocket Live Sync**: The dashboard and detail views currently poll or refresh on user actions. Adding WebSocket push notifications or Server-Sent Events (SSE) would enable multi-screen updates without manual refresh.
3. **Idempotency Key Retention Pruning**: Currently, idempotency records are stored permanently in PostgreSQL. In high-throughput production, an automated cleanup worker should purge records older than 7 days.
4. **Attachment Storage**: Work items support rich markdown and technical descriptions; direct binary file upload (e.g. S3 / Cloud Storage integration for log dumps) is intentionally deferred for the initial release.
