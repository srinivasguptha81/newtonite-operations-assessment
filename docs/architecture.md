# Newtonite Operations — System Architecture

This document describes the architectural layout, component responsibilities, request flow, database relationships, authorization boundaries, and concurrency mechanisms of **Newtonite Operations**.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    Client["Browser / Operational Clients"] -->|HTTP / HTTPS| ReverseProxy["Nginx (Port 5173 / 80)"]
    ReverseProxy -->|Static Assets| SPABundle["React 18 + Vite SPA"]
    ReverseProxy -->|/api/v1/* Requests| FastAPIServer["FastAPI Application (Port 8000)"]
    
    subgraph "FastAPI Modular Monolith"
        AuthMiddleware["Auth & JWT Dependency Engine"]
        APIEndpoints["API Routers (v1)"]
        Services["Domain Services (WorkItem, Dashboard, Auth)"]
        AtomicEngine["Atomic Concurrency & Idempotency Engine"]
        SQLAlchemyORM["SQLAlchemy 2.x ORM"]
        
        AuthMiddleware --> APIEndpoints
        APIEndpoints --> Services
        Services --> AtomicEngine
        AtomicEngine --> SQLAlchemyORM
    end
    
    SQLAlchemyORM -->|Connection Pool / WAL| RelationalDB[("PostgreSQL 16 / SQLite WAL")]
```

---

## 2. Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ TeamMembership : "belongs to"
    User ||--o{ WorkItem : "created"
    User ||--o{ WorkItem : "assigned"
    User ||--o{ Comment : "authored"
    User ||--o{ ActivityLog : "performed"
    User ||--o{ IdempotencyRecord : "scoped"

    Team ||--o{ TeamMembership : "contains"
    Team ||--o{ WorkItem : "owns"

    WorkItem ||--o{ Comment : "has"
    WorkItem ||--o{ ActivityLog : "tracks"

    User {
        string id PK
        string email UK
        string full_name
        string hashed_password
        string system_role "admin | manager | member"
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    Team {
        string id PK
        string name UK
        string slug UK
        string description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    TeamMembership {
        string id PK
        string team_id FK
        string user_id FK
        string role "manager | member"
        datetime created_at
    }

    WorkItem {
        string id PK
        string key UK "e.g. NEWT-1001"
        string title
        text description
        text reason
        string category
        string priority
        string status
        string team_id FK
        string creator_id FK
        string assignee_id FK
        datetime due_date
        integer version "Atomic OCC version"
        datetime created_at
        datetime updated_at
    }

    Comment {
        string id PK
        string work_item_id FK
        string author_id FK
        text content
        datetime created_at
        datetime updated_at
    }

    ActivityLog {
        string id PK
        string work_item_id FK
        string actor_id FK
        string action
        json details
        datetime created_at
    }

    IdempotencyRecord {
        string id PK
        string user_id FK
        string idempotency_key UK
        string request_path
        string request_hash "SHA-256"
        integer response_code
        text response_body
        datetime created_at
    }
```

---

## 3. Workflow & Approval State Machine

```mermaid
stateDiagram-v2
    [*] --> open : Item Created (Any Member)
    
    open --> in_progress : Start Work (Team Member)
    open --> blocked : Mark Blocked (Team Member)
    open --> awaiting_approval : Request Approval (Team Member)
    open --> closed : Close without Work (Team Member)

    in_progress --> blocked : Dependency Blocked (Team Member)
    in_progress --> awaiting_approval : Submit for Sign-off (Team Member)
    in_progress --> resolved : Complete Work (Team Member)
    in_progress --> closed : Terminate Work (Team Member)

    blocked --> in_progress : Resume (Team Member)
    blocked --> open : Revert to Open (Team Member)
    blocked --> closed : Cancel (Team Member)

    awaiting_approval --> resolved : Approved as Resolved (MANAGER or ADMIN Only)
    awaiting_approval --> in_progress : Approved to Proceed (MANAGER or ADMIN Only)
    awaiting_approval --> open : Rejected to Open (MANAGER or ADMIN Only)

    resolved --> closed : Archive (Team Member)
    resolved --> open : Reopen (Team Member)

    closed --> open : Reopen Closed Work (MANAGER or ADMIN Only)
```

---

## 4. Sequence: Optimistic Concurrency Control (OCC)

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Client A)
    actor Bob as Bob (Client B)
    participant Server as FastAPI Server
    participant DB as Relational Database

    Alice->>Server: GET /api/v1/work-items/NEWT-1001
    Server-->>Alice: WorkItem { ..., version: 1 }
    
    Bob->>Server: GET /api/v1/work-items/NEWT-1001
    Server-->>Bob: WorkItem { ..., version: 1 }

    Note over Alice,Server: Alice submits update with version 1
    Alice->>Server: PATCH /work-items/NEWT-1001 (title: "Fix A", version: 1)
    Server->>DB: UPDATE work_items SET title='Fix A', version=2 WHERE id='...' AND version=1
    DB-->>Server: 1 row affected (Success)
    Server-->>Alice: HTTP 200 OK (WorkItem version: 2)

    Note over Bob,Server: Bob submits update also with version 1 (Stale!)
    Bob->>Server: PATCH /work-items/NEWT-1001 (title: "Fix B", version: 1)
    Server->>DB: UPDATE work_items SET title='Fix B', version=2 WHERE id='...' AND version=1
    DB-->>Server: 0 rows affected (Stale Version detected!)
    Server->>DB: SELECT version FROM work_items WHERE id='...'
    DB-->>Server: Current version is 2
    Server-->>Bob: HTTP 409 Conflict {"detail": "Modified by another user (expected 1, current 2)"}
    Note over Bob: UI displays conflict resolution banner with 1-click reload
```

---

## 5. Sequence: Idempotent Creation & Request Deduplication

```mermaid
sequenceDiagram
    autonumber
    actor Client as Operational Client
    participant Server as FastAPI Server
    participant DB as Relational Database

    Client->>Server: POST /work-items (Header: Idempotency-Key: "uuid-123", Payload A)
    Server->>Server: Compute SHA-256(Payload A) = Hash_A
    Server->>DB: SELECT * FROM idempotency_records WHERE user_id=:user AND key='uuid-123'
    DB-->>Server: Null (Key not found)
    Server->>DB: BEGIN TX: Insert WorkItem, Insert ActivityLog, Insert IdempotencyRecord(key, Hash_A)
    DB-->>Server: TX Committed Successfully
    Server-->>Client: HTTP 201 Created (Item NEWT-1002)

    Note over Client,Server: Client experiences network timeout or retries submission
    Client->>Server: POST /work-items (Header: Idempotency-Key: "uuid-123", Payload A)
    Server->>Server: Compute SHA-256(Payload A) = Hash_A
    Server->>DB: SELECT * FROM idempotency_records WHERE user_id=:user AND key='uuid-123'
    DB-->>Server: Record found (stored hash matches Hash_A)
    Server-->>Client: HTTP 201 Created (Cached Item NEWT-1002, Header X-Cache: IDEMPOTENT-HIT)
    Note over Client: Zero duplicate work items created in database!

    Note over Client,Server: Client reuses "uuid-123" with DIFFERENT payload (Payload B)
    Client->>Server: POST /work-items (Header: Idempotency-Key: "uuid-123", Payload B)
    Server->>Server: Compute SHA-256(Payload B) = Hash_B
    Server->>DB: SELECT * FROM idempotency_records WHERE user_id=:user AND key='uuid-123'
    DB-->>Server: Record found (stored hash Hash_A != Hash_B)
    Server-->>Client: HTTP 409 Conflict {"detail": "Idempotency key reused with different request payload"}
```

---

## 6. Deployment Topology & Service Dependencies

- **PostgreSQL Database**: Healthy on port 5432 with persistent storage.
- **Backend API**: FastAPI container running behind health check `curl -f /api/v1/health`.
- **Frontend SPA**: Nginx container serving compiled static assets and proxying `/api/` upstream.
- **Local Fallback**: SQLite WAL mode with zero docker installation requirements.
