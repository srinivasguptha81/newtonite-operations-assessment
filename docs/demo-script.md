# Newtonite Operations — 5-to-7 Minute Demonstration Script

This walkthrough script guides evaluators through live verification of all key operational, concurrency, and security behaviors in **Newtonite Operations**.

---

## Prerequisites for Demo
Ensure both services are running:
- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/api/v1/docs`

All demo accounts use password: `NewtoniteDemo2026!`

---

## Step 1: Authentication & Demo Persona Switching (0:00 - 0:45)
1. Navigate to `http://localhost:5173`.
2. Notice the **1-Click Assessment Personas** section on the login screen.
3. Click on **Sarah Chen (System Administrator)**.
4. Notice instant login to the Command Center dashboard. The top right displays Sarah's name and `admin` system badge.
5. In the top navbar, click the **Demo Persona** dropdown and switch to **Marcus Vance (Engineering Lead - Manager)**.
6. Notice that Marcus's dashboard instantly adapts to Core Engineering and his authorized scope.

---

## Step 2: Dashboard Overview & Operational Metrics (0:45 - 1:30)
1. Examine the metric counter cards:
   - **Total Open**: Total active items across authorized teams.
   - **Critical & High Priority**: Items requiring immediate attention.
   - **Overdue Items**: High-contrast indicator for items exceeding target due dates.
   - **Blocked Items**: Items stalled on external dependencies.
   - **Awaiting Approval**: Items requiring manager sign-off.
   - **Assigned to Me**: Items in the active user's personal queue.
2. In the top filter bar, toggle between **"All Authorized Teams"** and specific teams (e.g. `Core Engineering`, `Payments & Billing`).
3. Notice that metrics, urgent items, and recent activity dynamically update.

---

## Step 3: Work-Item Creation with Idempotency Key (1:30 - 2:30)
1. Click the **"+ Create Item"** button in the top navbar.
2. Notice the **Idempotency-Key** banner displaying an auto-generated UUIDv4 key (e.g., `8f7b...`).
3. Fill in the form:
   - Title: `Intermittent 502 Bad Gateway on Stripe Webhook Consumer`
   - Category: `Payment Investigation`
   - Priority: `High`
   - Team: `Payments & Billing`
   - Reason: `Prevent duplicate customer charges during reconciliation.`
   - Description: `High lock contention observed on user_billing table during mass renewal.`
4. Click **"Create Item"**.
5. The item is saved with `version: 1` and key `NEWT-1009`.

---

## Step 4: Demonstrate Duplicate-Request Protection (Idempotency Replay) (2:30 - 3:15)
1. Click **"+ Create Item"** again.
2. Enter the same details, but click the **"Test Idempotent Duplicate Replay"** button at the bottom left.
3. Notice the green success alert:
   > *"Idempotency Verified! Request was safely replayed. Work Item 'NEWT-1009' was returned without duplicate creation (Header X-Cache: IDEMPOTENT-HIT)."*
4. Close the modal and check the Work Items table. Confirm that only **one** item exists (zero duplicate tickets created).

---

## Step 5: Workflow Progression & Manager Approval Enforcement (3:15 - 4:15)
1. Switch active persona to **Priya Sharma (Backend Engineer - Member)** using the navbar dropdown.
2. Open item `NEWT-1002` (*Customer payout discrepancy in EU region settlement accounts*), which is in status **Awaiting Approval**.
3. Notice that the **"Approve & Resolve"** button is disabled with the label:
   `Manager Required: Only Team Managers or Administrators can approve this item`.
4. Switch persona to **Elena Rostova (Operations Lead - Manager)**.
5. Re-open `NEWT-1002`. Notice the **"Approve & Resolve"** button is now active with the green badge `Manager Action`.
6. Click **"Approve & Resolve"**.
7. Status instantly updates to **Resolved** and version increments.
8. Switch to the **Audit History** tab: confirm that an `approved` activity record was atomically logged with actor `Elena Rostova`.

---

## Step 6: Collaboration Comments & Stale-Update Conflict (HTTP 409) (4:15 - 5:15)
1. Open item `NEWT-1001`.
2. Click the **Collaboration** tab and post a comment:
   `"Identified query lock timeout in PostgreSQL. Deploying connection pool adjustment."`
3. Notice the comment posts instantly with author badge and timestamp.
4. Click the **[Simulate Stale 409]** button in the top right of the modal.
5. Notice the high-visibility red banner appears:
   > **Optimistic Concurrency Conflict (HTTP 409)**
   > *"Conflict: Work item was modified by another user (expected version 0, current version 3)."*
6. Click **"Reload Latest Version"**. The latest state is smoothly reconciled without data loss.

---

## Step 7: Resource-Level Cross-Team Authorization Failure (5:15 - 6:00)
1. Switch persona to **Carlos Mendez (Support Specialist)** who belongs ONLY to Customer Support.
2. Carlos attempts to view items in Core Engineering or Compliance. Notice that his Work Items table and Dashboard *only* display Customer Support work items.
3. Open Developer Tools (F12) or Swagger API docs (`http://localhost:8000/api/v1/docs`).
4. Attempt a `GET /api/v1/work-items/{id}` for an item belonging to `Core Engineering` using Carlos's token:
   - Server returns **HTTP 403 Forbidden**:
     `"Resource Access Denied: You do not have permission to view or manage work items for this team."`

---

## Step 8: Automated Test Verification (6:00 - 6:45)
1. Run the test suite:
   ```powershell
   d:\hewlett-assessment\.venv\Scripts\pytest.exe -v
   ```
2. Verify that all **27 tests pass**:
   - Concurrency race condition tests
   - Idempotency replay & payload mismatch tests
   - Resource-level team authorization & privilege escalation prevention
   - Workflow state machine & manager approval checks
   - Audit transaction atomicity & rollback verification
