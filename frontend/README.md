# Newtonite Operations — Frontend Client Application

Responsive Single Page Application (SPA) built with React 18, TypeScript, Vite, and Tailwind CSS for real-time operational incident and work management.

---

## 1. Directory Structure

```text
frontend/
├── src/
│   ├── api/
│   │   └── client.ts             # Typed API client, token handling, OCC conflict detection
│   ├── components/
│   │   ├── Navbar.tsx            # Navigation bar with 1-click evaluation persona switcher
│   │   ├── StatusBadge.tsx       # Status indicators with icons
│   │   ├── PriorityBadge.tsx     # Priority badges (Critical, High, Medium, Low)
│   │   ├── CategoryBadge.tsx     # Operational category badges
│   │   ├── CreateWorkItemModal.tsx # Item creation modal with idempotency key generator
│   │   └── WorkItemDetailModal.tsx # Detail view with OCC conflict banner, approvals, comments, audit
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Metric cards, urgent queue, approval queue, activity feed
│   │   ├── WorkItemsPage.tsx     # Filterable, searchable table with pagination
│   │   ├── TeamsPage.tsx         # Teams management, members roster & roles
│   │   ├── AdminUsersPage.tsx    # System user role management (Admin only)
│   │   ├── AuditLogPage.tsx      # System-wide audit trail explorer
│   │   └── LoginPage.tsx         # Auth form with 1-click demo personas
│   ├── types/
│   │   └── index.ts              # TypeScript domain types
│   ├── App.tsx                   # Main layout, tab navigation, global modal controls
│   ├── main.tsx                  # React DOM entrypoint
│   └── index.css                 # Custom styles and scrollbars
├── package.json                  # Dependencies & scripts
├── vite.config.ts                # Vite config with API reverse proxy
└── tsconfig.json                 # Strict TypeScript configuration
```

---

## 2. Key Features

- **Operational Command Dashboard**: Real-time aggregated counters for Total Open, Critical, High, Overdue, Blocked, and Awaiting Approval items.
- **1-Click Assessment Personas**: Instant switching between Administrator, Engineering Manager, Operations Manager, and Team Members directly in the UI.
- **Optimistic Concurrency Conflict Banner**: Displays `HTTP 409 Conflict` resolution prompt when stale versions are submitted, providing 1-click reload.
- **Workflow State Controls**: Gated action buttons ensuring only authorized Managers and Admins can approve items awaiting sign-off.
- **Idempotency Verification**: Displays active `Idempotency-Key` and provides a built-in test button to demonstrate duplicate replay handling.
- **Collaboration & Audit Tabs**: Threaded comments and an immutable chronological audit trail for every work item.

---

## 3. Development & Build Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (with API proxy to http://127.0.0.1:8000)
npm run dev

# 3. Compile production build
npm run build

# 4. Preview compiled production bundle
npm run preview
```

---

## 4. Environment & Proxy

In local development, requests to `/api/*` are automatically proxied by Vite to the backend running at `http://127.0.0.1:8000`. In production Docker deployments, Nginx handles reverse proxying.
