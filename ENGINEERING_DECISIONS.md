# Engineering Decisions & Architectural Trade-offs

This document details the architectural decisions, rationale, trade-offs, and alternatives considered during the design and implementation of **Newtonite Operations** — an internal incident and operational work coordination platform.

---

## 1. Modular Monolith Architecture & Technology Selection

### Context & Problem
Operations under pressure require coordinating customer escalations, engineering investigations, billing anomalies, compliance requests, and production incidents. The initial challenge is solving data fragmentation, lost state, and concurrency conflicts across teams.

### Chosen Approach
We adopted a **Modular Monolith** architecture:
- **Backend**: Python 3.11+ with FastAPI, Pydantic v2, and SQLAlchemy 2.x.
- **Frontend**: Single Page Application (SPA) with React 18, TypeScript, Vite, and Tailwind CSS.
- **Database**: Relational storage using PostgreSQL (with transparent SQLite WAL mode support for zero-dependency local testing).

### Why Selected
- **Data Integrity & Atomic Transactions**: Monolithic architecture allows transactional atomicity across domain mutations, audit logs, and idempotency records using single database transactions without distributed consensus overhead (e.g. 2PC or Saga).
- **Type Safety End-to-End**: Pydantic schemas on the backend and TypeScript interfaces on the frontend guarantee strict contracts.
- **Developer Velocity**: Faster testing and validation than microservices, zero network partitioning latency between services.

### Alternatives Considered
- **Microservices Architecture**: Rejected. Introducing separate services for Auth, WorkItems, and Audit would require distributed transactions, outbox workers, network retries, and eventual consistency. In an operational incident platform, eventual consistency can cause two responders to work the same critical incident or act on stale state.

### Trade-offs & Limitations
- All domain modules share the same application lifecycle. If a heavy query stresses the database, it could impact dashboard responsiveness unless query isolation and connection pooling are strictly configured.

---

## 2. Relational Data Modeling & Composite Indexing Strategy

### Context & Problem
Operational platforms experience continuous growth in audit logs, frequent status transitions, and heavy dashboard aggregation queries under load. Tens of thousands of work items and hundreds of thousands of audit records must remain rapidly queryable.

### Chosen Approach
Relational schema designed with strict foreign key constraints and composite indexes:
- `users`: Indexed on `email`, `system_role`.
- `teams`: Indexed on `slug`, `name`.
- `team_memberships`: Unique constraint `(team_id, user_id)`.
- `work_items`: Primary key UUID, human-friendly unique `key` (e.g., `NEWT-1001`), indexed on `team_id`, `status`, `priority`, `assignee_id`, `due_date`, `created_at`, `updated_at`.
- **Composite Indexes**:
  - `idx_workitem_team_status (team_id, status)`: Accelerates dashboard team-level counts.
  - `idx_workitem_status_priority (status, priority)`: Accelerates urgent queue lookups.
  - `idx_workitem_assignee_status (assignee_id, status)`: Accelerates personal queue lookups.
- `activity_logs`: Indexed on `work_item_id`, `actor_id`, `created_at`.
- `idempotency_records`: Unique constraint `(user_id, idempotency_key)`.

### Why Selected
Relational constraints guarantee referential integrity at the engine level. Composite indexes eliminate full table scans for all core operational views.

### Alternatives Considered
- **Document Store (e.g. MongoDB)**: Rejected. Document embedding would make cross-cutting queries (e.g., "all items awaiting approval assigned to my teams") inefficient and would sacrifice multi-table ACID guarantees.

### Trade-offs & Limitations
- As `activity_logs` scales to millions of rows, future range partitioning by `created_at` (e.g. monthly partitions) will be necessary to keep index sizes bounded.

---

## 3. Resource-Level Authorization & Multi-Team Boundary Enforcement

### Context & Problem
Newtonite has multiple teams (Core Engineering, Customer Support, Payments & Billing, Compliance). A user may belong to one or more teams with different responsibilities. Ordinary users must not inspect, edit, comment on, assign, or approve items belonging to teams they do not belong to. Self-privilege escalation must be strictly prevented.

### Chosen Approach
- **System Roles**: `admin`, `manager`, `member`.
- **Team Roles**: `manager`, `member`.
- **Server-Side Enforcement**: Implemented in `deps.py` and `WorkItemService.check_user_can_access_item`:
  - `admin`: Has global operational oversight across all teams.
  - `manager`: Has elevated approval and management authority for teams where they hold the Manager role.
  - `member`: Strictly bounded to teams they are an active member of. Cross-team reads, updates, comments, and transitions return `403 Forbidden`.
  - Assignment restriction: An item can ONLY be assigned to an active member of that item's team.
  - First-admin bootstrap: An administrative bootstrap endpoint/command that permanently disables itself once the first administrator is created.

### Why Selected
Enforcing checks at the repository/service layer guarantees that hidden UI buttons are never relied upon for security. Every API request authenticates the JWT subject and verifies relational team membership.

### Alternatives Considered
- **Role-Based Access Control (RBAC) without Team Scoping**: Rejected because standard RBAC treats all "Members" identically, allowing cross-department data leakage.
- **Complex Attribute-Based Access Control (ABAC)**: Unnecessary complexity for the current requirements.

### Trade-offs & Limitations
- If a user needs temporary cross-team collaboration, they must be explicitly added to that team by a Manager or Administrator.

---

## 4. Optimistic Concurrency Control via Atomic SQL Versioning

### Context & Problem
Multiple engineers or operations agents may view and edit the same work item simultaneously. If User A updates an item while User B is viewing an older snapshot, User B's subsequent update must not silently overwrite User A's changes (the "lost update" anomaly).

### Chosen Approach
We implemented **Atomic Optimistic Concurrency Control**:
1. Every `WorkItem` has an integer `version` field (initialized to 1).
2. Every state-changing API request (`PATCH`, assign, transition) MUST supply the expected `version`.
3. The database update executes as a single atomic query:
   ```sql
   UPDATE work_items 
   SET title = :title, version = version + 1, updated_at = :now 
   WHERE id = :id AND version = :expected_version;
   ```
4. If `rowcount == 0`, the server checks whether the item exists:
   - If not found: `404 Not Found`.
   - If found: DB version != expected version -> Return `HTTP 409 Conflict` with `X-Current-Version` header and descriptive message:
     `"Conflict: Work item was modified by another user (expected version X, current version Y)"`.
5. The frontend catches HTTP 409 and displays an interactive conflict resolution banner with a 1-click "Reload Latest Version" action.

### Why Selected
Zero race condition. Python-level version comparison (`if item.version != expected: abort`) suffers from a Time-Of-Check to Time-Of-Use (TOCTOU) race condition when simultaneous requests execute. Atomic SQL updates execute within database row locks and guarantee absolute correctness.

### Alternatives Considered
- **Pessimistic Locking (`SELECT ... FOR UPDATE`)**: Kept for potential batch operations, but unsuitable for user editing sessions because holding long database locks while an operator is typing leads to connection pool starvation and deadlocks.

### Trade-offs & Limitations
- In heavy contention scenarios, the losing client receives a conflict and must refresh. For operational tickets, this is the desired behavior because overwriting another engineer's notes is hazardous.

---

## 5. Idempotent Creation with Request Fingerprinting

### Context & Problem
Under poor network connectivity or browser retries, a user or client script might send the creation request multiple times, leading to duplicate tickets (e.g. duplicate payment investigations).

### Chosen Approach
- Support for `Idempotency-Key` request header.
- Dedicated `idempotency_records` table storing `(user_id, idempotency_key, request_path, request_hash, response_code, response_body, created_at)`.
- Unique database constraint on `(user_id, idempotency_key)`.
- **Execution Flow**:
  1. Hash the canonicalized incoming JSON payload (`SHA-256`).
  2. If key exists:
     - If stored `request_hash != current_hash`: Return `HTTP 409 Conflict` ("Idempotency-Key reused with different request payload").
     - If stored `request_hash == current_hash`: Return the previously cached response with `HTTP 201 Created` and header `X-Cache: IDEMPOTENT-HIT`.
  3. If key does not exist: Create the `WorkItem`, `ActivityLog`, and `IdempotencyRecord` atomically inside a single transaction.

### Why Selected
Protects against both network retries (safe idempotent replay) and key-reuse bugs (conflict on payload mismatch).

### Alternatives Considered
- **In-Memory Redis Cache**: Rejected because an in-memory cache loses keys during restarts or failovers, allowing duplicate creations in the database. Durable database persistence guarantees deduplication.

### Trade-offs & Limitations
- Storing response bodies consumes database space. A periodic cleanup cron job can prune idempotency keys older than 7 days.

---

## 6. Durable Audit History & Transaction Consistency

### Context & Problem
Operational decisions, status changes, priority shifts, and approvals must be traceable for compliance and post-mortems. If a work item update commits but the audit record fails, the audit trail becomes incomplete. If an update fails, no ghost audit entry should exist.

### Chosen Approach
- Every state change (`created`, `status_changed`, `priority_changed`, `assigned`, `unassigned`, `approved`, `approval_rejected`, `comment_added`, `updated`) writes an `ActivityLog` in the **exact same SQLAlchemy session** before `db.commit()`.
- If an exception occurs, `db.rollback()` discards both the state mutation and the audit record.
- Activity records are strictly append-only; no API endpoints permit updating or deleting audit logs.

### Why Selected
Guarantees transaction consistency without orphan records or phantom audit logs.

---

## 7. Synchronous vs. Asynchronous Processing

### Context & Problem
Operations systems frequently contemplate background notifications, webhooks, or secondary enrichment.

### Chosen Approach
We chose **synchronous, reliable in-transaction processing** for all core mutations, status changes, and audit entries.
- We deliberately avoided introducing an unreliable background queue (e.g. fire-and-forget `asyncio.create_task` or celery without persistence) because uncommitted background tasks silently drop notifications on server crash.
- If email or external webhooks are added in the future, the **Transactional Outbox Pattern** is the recommended architectural evolution: write event to an `outbox_events` table in the same transaction, and a dedicated worker polls and delivers messages with at-least-once guarantees.

---

## 8. Deliberate Scope Cuts & Future Scaling

### What Was Deliberately Omitted for Assessment Focus:
1. **Full-Text Search Engine (Elasticsearch/OpenSearch)**: PostgreSQL `ILIKE` and trigram indexes on `title`, `description`, and `key` easily handle tens of thousands of items with sub-10ms response times.
2. **WebSocket Push Notifications**: Polling on view refresh and manual refresh controls were preferred over WebSocket state synchronization to prevent reconnection stampedes and state drift.
3. **Complex Third-Party OAuth / SSO**: Password hashing with Bcrypt + JWT access tokens was implemented with 1-click persona switching to allow immediate evaluation of all roles.

### Future Scaling Path (Tens of Thousands of Items to Millions):
- Read replicas for dashboard aggregates.
- Redis caching for team membership lookups.
- Table partitioning for `activity_logs` by month.
