# Newtonite Operations — Backend API Service

FastAPI-based modular monolith backend providing relational data persistence, optimistic concurrency control, request deduplication, multi-team authorization, and transactional audit trails.

---

## 1. Directory Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection (Auth, Roles, Team authorization)
│   │   └── v1/
│   │       ├── auth.py           # Register, login, current user, first-admin bootstrap
│   │       ├── users.py          # User management & role promotion (Admin only)
│   │       ├── teams.py          # Team CRUD, membership & role assignment
│   │       ├── work_items.py     # OCC updates, idempotent create, search, filters
│   │       ├── comments.py       # Item comments & discussion
│   │       ├── activity.py       # Audit history & system timeline
│   │       ├── dashboard.py      # Aggregated metrics & urgent task summary
│   │       └── health.py         # Database connectivity healthcheck
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings & environment variables
│   │   └── security.py           # Bcrypt hashing & PyJWT tokens
│   ├── db/
│   │   ├── base.py               # SQLAlchemy DeclarativeBase
│   │   ├── session.py            # Engine, sessionmaker, SQLite WAL mode / Postgres pool
│   │   └── seed.py               # Development seed script (7 users, 4 teams, 8 items)
│   ├── models/                   # SQLAlchemy ORM models (User, Team, WorkItem, etc.)
│   ├── schemas/                  # Pydantic v2 validation contracts
│   ├── services/                 # Domain business logic (WorkItemService, AuthService, etc.)
│   └── main.py                   # FastAPI application entrypoint with CORS & lifespan
├── alembic/                      # Alembic migration environment
│   └── versions/                 # Schema migration scripts
├── tests/                        # Automated Pytest suite (27 tests)
├── alembic.ini                   # Alembic configuration
└── requirements.txt              # Pinned dependencies
```

---

## 2. Key Architecture & Correctness Behaviors

1. **Atomic Optimistic Concurrency Control (OCC)**:
   - Version-guarded atomic update queries prevent lost updates during concurrent edits:
     `UPDATE work_items SET ... version = version + 1 WHERE id = :id AND version = :expected_version`
   - Rejects stale edits with `HTTP 409 Conflict`.
2. **Idempotent Request Handling**:
   - `Idempotency-Key` header with SHA-256 fingerprinting.
   - Retries return cached responses with `X-Cache: IDEMPOTENT-HIT`.
   - Payload mismatches with reused keys return `HTTP 409 Conflict`.
3. **Resource-Level Multi-Team Authorization**:
   - Server-enforced team isolation: Members cannot view or edit items outside their teams.
   - Manager approval required for moving items out of `awaiting_approval` or reopening `closed` work.
4. **Transaction-Consistent Audit Trail**:
   - State mutations and `ActivityLog` entries commit in the exact same transaction.

---

## 3. Local Setup & Execution

```bash
# 1. Activate virtual environment (from repo root)
# Windows:
..\.venv\Scripts\Activate.ps1
# Linux/macOS:
source ../.venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run database migrations
alembic upgrade head

# 4. Seed development data
python -m app.db.seed

# 5. Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Running Automated Tests

```bash
# From the backend directory:
pytest -v
```

All 27 automated tests cover concurrency races, idempotency deduplication, cross-team authorization, workflow state machines, and audit consistency.

---

## 5. API Documentation

- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`
- **Health Check**: `http://localhost:8000/api/v1/health`
