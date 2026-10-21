# Newtonite Operations — Infrastructure & Container Deployment

Docker Compose configuration orchestrating PostgreSQL 16, the FastAPI backend service, and the React frontend served via Nginx Alpine.

---

## 1. Directory Structure

```text
infra/
├── Dockerfile.backend   # Python 3.11-slim container with curl health check
├── Dockerfile.frontend  # Multi-stage Node build & Nginx Alpine runner
├── docker-compose.yml   # Multi-service composition (Postgres, Backend, Frontend)
└── nginx.conf           # Reverse proxy configuration for frontend and /api/
```

---

## 2. Services Overview

| Service | Container Name | Port Mapping | Health Check |
| :--- | :--- | :--- | :--- |
| **db** | `newtonite-postgres` | `5432:5432` | `pg_isready -U postgres` |
| **backend** | `newtonite-backend` | `8000:8000` | `curl -f http://localhost:8000/api/v1/health` |
| **frontend** | `newtonite-frontend` | `5173:80` | `wget -q --spider http://localhost/` |

---

## 3. Launching with Docker Compose

From the repository root:
```bash
docker compose up --build
```

The services start in dependency order:
1. `db` starts and initializes the `newtonite` database volume.
2. `backend` waits for `db` to be healthy, executes `alembic upgrade head`, runs `python -m app.db.seed`, and starts Uvicorn.
3. `frontend` waits for `backend` to be healthy, builds the React app, and serves it via Nginx.

---

## 4. Environment Variables

Configure via `.env` file (copied from `.env.example`):
- `POSTGRES_USER`: Database superuser (default: `postgres`)
- `POSTGRES_PASSWORD`: Database password (default: `postgres`)
- `POSTGRES_DB`: Database name (default: `newtonite`)
- `SECRET_KEY`: Cryptographic signing key for JWT tokens
- `ADMIN_BOOTSTRAP_SECRET`: Secret token for initial administrator creation
