import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.team import Team, TeamMembership
from app.models.work_item import WorkItem
from app.models.comment import Comment
from app.models.activity import ActivityLog
from app.models.enums import (
    UserRole,
    TeamRole,
    WorkItemCategory,
    WorkItemPriority,
    WorkItemStatus,
    ActivityAction,
)


def seed_database():
    """Seeds the development database with realistic operational data."""
    print("Beginning database seeding for Newtonite Operations...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Database already contains users. Skipping duplicate seeding.")
            return

        now = datetime.now(timezone.utc)
        default_password_hash = get_password_hash("NewtoniteDemo2026!")

        # 1. Create Users
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@newtonite.internal",
            full_name="Sarah Chen (System Admin)",
            hashed_password=default_password_hash,
            system_role=UserRole.ADMIN.value,
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )
        mgr_eng = User(
            id=str(uuid.uuid4()),
            email="manager.eng@newtonite.internal",
            full_name="Marcus Vance (Engineering Lead)",
            hashed_password=default_password_hash,
            system_role=UserRole.MANAGER.value,
            is_active=True,
            created_at=now - timedelta(days=28),
            updated_at=now - timedelta(days=28),
        )
        mgr_ops = User(
            id=str(uuid.uuid4()),
            email="manager.ops@newtonite.internal",
            full_name="Elena Rostova (Operations Lead)",
            hashed_password=default_password_hash,
            system_role=UserRole.MANAGER.value,
            is_active=True,
            created_at=now - timedelta(days=28),
            updated_at=now - timedelta(days=28),
        )
        dev_alex = User(
            id=str(uuid.uuid4()),
            email="alex.dev@newtonite.internal",
            full_name="Alex Rivera (Senior Engineer)",
            hashed_password=default_password_hash,
            system_role=UserRole.MEMBER.value,
            is_active=True,
            created_at=now - timedelta(days=25),
            updated_at=now - timedelta(days=25),
        )
        dev_priya = User(
            id=str(uuid.uuid4()),
            email="priya.dev@newtonite.internal",
            full_name="Priya Sharma (Backend Engineer)",
            hashed_password=default_password_hash,
            system_role=UserRole.MEMBER.value,
            is_active=True,
            created_at=now - timedelta(days=25),
            updated_at=now - timedelta(days=25),
        )
        ops_carlos = User(
            id=str(uuid.uuid4()),
            email="carlos.ops@newtonite.internal",
            full_name="Carlos Mendez (Support Specialist)",
            hashed_password=default_password_hash,
            system_role=UserRole.MEMBER.value,
            is_active=True,
            created_at=now - timedelta(days=20),
            updated_at=now - timedelta(days=20),
        )
        compliance_dana = User(
            id=str(uuid.uuid4()),
            email="dana.compliance@newtonite.internal",
            full_name="Dana Kim (Compliance Officer)",
            hashed_password=default_password_hash,
            system_role=UserRole.MEMBER.value,
            is_active=True,
            created_at=now - timedelta(days=20),
            updated_at=now - timedelta(days=20),
        )

        users = [admin, mgr_eng, mgr_ops, dev_alex, dev_priya, ops_carlos, compliance_dana]
        db.add_all(users)
        db.flush()

        # 2. Create Teams
        team_eng = Team(
            id=str(uuid.uuid4()),
            name="Core Engineering",
            slug="core-engineering",
            description="Core platform services, APIs, database infrastructure, and backend systems.",
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )
        team_support = Team(
            id=str(uuid.uuid4()),
            name="Customer Support & Tier-2",
            slug="customer-support",
            description="Customer escalation handling, user account inquiries, and operational troubleshooting.",
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )
        team_payments = Team(
            id=str(uuid.uuid4()),
            name="Payments & Billing",
            slug="payments-billing",
            description="Financial reconciliations, chargeback investigations, and payment gateway health.",
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )
        team_compliance = Team(
            id=str(uuid.uuid4()),
            name="Compliance & Legal",
            slug="compliance-legal",
            description="Regulatory inquiries, data deletion requests, audit logs, and compliance signoffs.",
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )

        teams = [team_eng, team_support, team_payments, team_compliance]
        db.add_all(teams)
        db.flush()

        # 3. Create Team Memberships
        memberships = [
            # Engineering
            TeamMembership(id=str(uuid.uuid4()), team_id=team_eng.id, user_id=mgr_eng.id, role=TeamRole.MANAGER.value, created_at=now - timedelta(days=28)),
            TeamMembership(id=str(uuid.uuid4()), team_id=team_eng.id, user_id=dev_alex.id, role=TeamRole.MEMBER.value, created_at=now - timedelta(days=25)),
            TeamMembership(id=str(uuid.uuid4()), team_id=team_eng.id, user_id=dev_priya.id, role=TeamRole.MEMBER.value, created_at=now - timedelta(days=25)),
            
            # Support
            TeamMembership(id=str(uuid.uuid4()), team_id=team_support.id, user_id=mgr_ops.id, role=TeamRole.MANAGER.value, created_at=now - timedelta(days=28)),
            TeamMembership(id=str(uuid.uuid4()), team_id=team_support.id, user_id=ops_carlos.id, role=TeamRole.MEMBER.value, created_at=now - timedelta(days=20)),
            
            # Payments
            TeamMembership(id=str(uuid.uuid4()), team_id=team_payments.id, user_id=mgr_ops.id, role=TeamRole.MANAGER.value, created_at=now - timedelta(days=28)),
            TeamMembership(id=str(uuid.uuid4()), team_id=team_payments.id, user_id=dev_priya.id, role=TeamRole.MEMBER.value, created_at=now - timedelta(days=20)),
            
            # Compliance
            TeamMembership(id=str(uuid.uuid4()), team_id=team_compliance.id, user_id=compliance_dana.id, role=TeamRole.MANAGER.value, created_at=now - timedelta(days=20)),
        ]
        db.add_all(memberships)
        db.flush()

        # 4. Create Work Items covering varied scenarios
        items_data = [
            {
                "key": "NEWT-1001",
                "title": "Stripe webhook 500 error on recurring subscription invoices",
                "description": "Recurring subscription billing webhooks from Stripe are receiving intermittent HTTP 500 responses from /webhooks/stripe-events. Root cause appears to be high database transaction lock timeouts on the user_billing table during mass renewal windows.",
                "reason": "Prevent subscription cancellations and inaccurate invoice state for 450+ enterprise accounts.",
                "category": WorkItemCategory.PAYMENT_INVESTIGATION.value,
                "priority": WorkItemPriority.CRITICAL.value,
                "status": WorkItemStatus.IN_PROGRESS.value,
                "team_id": team_eng.id,
                "creator_id": mgr_ops.id,
                "assignee_id": dev_priya.id,
                "due_date": now + timedelta(hours=4),
                "created_at": now - timedelta(days=2, hours=3),
                "updated_at": now - timedelta(hours=1),
                "version": 3,
            },
            {
                "key": "NEWT-1002",
                "title": "Customer payout discrepancy in EU region settlement accounts",
                "description": "Cross-border EUR settlements for merchant ID batch #EU-8819 show a mismatch of EUR 4,120 between the settlement ledger and intermediary bank transfer receipts. Needs financial reconciliation.",
                "reason": "Regulatory compliance with European payment regulations and contractual merchant SLA.",
                "category": WorkItemCategory.PAYMENT_INVESTIGATION.value,
                "priority": WorkItemPriority.HIGH.value,
                "status": WorkItemStatus.AWAITING_APPROVAL.value,
                "team_id": team_payments.id,
                "creator_id": ops_carlos.id,
                "assignee_id": dev_priya.id,
                "due_date": now + timedelta(days=1),
                "created_at": now - timedelta(days=1, hours=6),
                "updated_at": now - timedelta(hours=2),
                "version": 2,
            },
            {
                "key": "NEWT-1003",
                "title": "Database connection pool exhaustion during peak reporting window",
                "description": "PostgreSQL connection pool maxes out at 100 connections at 09:00 UTC daily when analytics ETL pipelines trigger queries without statement timeouts.",
                "reason": "Production reliability risk impacting customer dashboard latency and checkout requests.",
                "category": WorkItemCategory.PRODUCTION_INCIDENT.value,
                "priority": WorkItemPriority.CRITICAL.value,
                "status": WorkItemStatus.OPEN.value,
                "team_id": team_eng.id,
                "creator_id": dev_alex.id,
                "assignee_id": None,
                "due_date": now - timedelta(hours=2),  # Overdue!
                "created_at": now - timedelta(days=3),
                "updated_at": now - timedelta(days=1),
                "version": 1,
            },
            {
                "key": "NEWT-1004",
                "title": "GDPR Right to Be Forgotten request for Customer Account #88412",
                "description": "Formal data erasure request submitted by user via privacy portal. Requires cascading purge across transactional databases, audit backups, and third-party data sinks.",
                "reason": "Legal mandate under GDPR Article 17 with statutory 30-day resolution deadline.",
                "category": WorkItemCategory.COMPLIANCE_REQUEST.value,
                "priority": WorkItemPriority.MEDIUM.value,
                "status": WorkItemStatus.IN_PROGRESS.value,
                "team_id": team_compliance.id,
                "creator_id": compliance_dana.id,
                "assignee_id": compliance_dana.id,
                "due_date": now + timedelta(days=14),
                "created_at": now - timedelta(days=5),
                "updated_at": now - timedelta(days=1),
                "version": 2,
            },
            {
                "key": "NEWT-1005",
                "title": "Bulk refund approval request for canceled EMEA user workshop",
                "description": "EMEA Operations had to cancel the annual London workshop due to venue flooding. 120 attendee tickets totaling £36,000 need bulk refund processing.",
                "reason": "Requires Manager/Finance sign-off before executing mass batch refunds.",
                "category": WorkItemCategory.OPERATIONAL_TASK.value,
                "priority": WorkItemPriority.HIGH.value,
                "status": WorkItemStatus.AWAITING_APPROVAL.value,
                "team_id": team_payments.id,
                "creator_id": ops_carlos.id,
                "assignee_id": None,
                "due_date": now + timedelta(days=2),
                "created_at": now - timedelta(hours=18),
                "updated_at": now - timedelta(hours=5),
                "version": 1,
            },
            {
                "key": "NEWT-1006",
                "title": "SSO SAML certificate expiration on internal Okta gateway",
                "description": "The X.509 SAML signing certificate for employee single-sign-on will expire in 48 hours. Needs cert rotation in key vault and Okta admin panel.",
                "reason": "Risk of all internal employees being locked out of corporate applications.",
                "category": WorkItemCategory.ENGINEERING_PROBLEM.value,
                "priority": WorkItemPriority.CRITICAL.value,
                "status": WorkItemStatus.BLOCKED.value,
                "team_id": team_eng.id,
                "creator_id": dev_alex.id,
                "assignee_id": dev_alex.id,
                "due_date": now + timedelta(hours=12),
                "created_at": now - timedelta(days=1),
                "updated_at": now - timedelta(hours=3),
                "version": 2,
            },
            {
                "key": "NEWT-1007",
                "title": "Tier-2 ticket backlog reduction: Enterprise onboarding issues",
                "description": "Support queue has 35 unassigned enterprise onboarding inquiries regarding custom webhook endpoints and domain verification DNS records.",
                "reason": "Contractual 24-hour initial response SLA for tier-1 enterprise partners.",
                "category": WorkItemCategory.CUSTOMER_ISSUE.value,
                "priority": WorkItemPriority.MEDIUM.value,
                "status": WorkItemStatus.OPEN.value,
                "team_id": team_support.id,
                "creator_id": mgr_ops.id,
                "assignee_id": ops_carlos.id,
                "due_date": now + timedelta(days=3),
                "created_at": now - timedelta(days=4),
                "updated_at": now - timedelta(days=2),
                "version": 1,
            },
            {
                "key": "NEWT-1008",
                "title": "Redis cache eviction policy tuning for session store",
                "description": "Resolved redis memory pressure by switching policy from noeviction to volatile-lru and scaling memory cluster by 2GB.",
                "reason": "Prevent user session dropouts during flash sale traffic spikes.",
                "category": WorkItemCategory.ENGINEERING_PROBLEM.value,
                "priority": WorkItemPriority.LOW.value,
                "status": WorkItemStatus.RESOLVED.value,
                "team_id": team_eng.id,
                "creator_id": dev_priya.id,
                "assignee_id": dev_alex.id,
                "due_date": now - timedelta(days=5),
                "created_at": now - timedelta(days=10),
                "updated_at": now - timedelta(days=2),
                "version": 4,
            },
        ]

        work_items = []
        for d in items_data:
            item = WorkItem(id=str(uuid.uuid4()), **d)
            work_items.append(item)
            db.add(item)
        db.flush()

        # 5. Create Comments & Activity Logs
        # For NEWT-1001
        item1 = work_items[0]
        c1 = Comment(
            id=str(uuid.uuid4()),
            work_item_id=item1.id,
            author_id=mgr_ops.id,
            content="Escalating this immediately. We had 14 customer complaints this morning about renewal charges failing.",
            created_at=now - timedelta(days=1, hours=20),
        )
        c2 = Comment(
            id=str(uuid.uuid4()),
            work_item_id=item1.id,
            author_id=dev_priya.id,
            content="Investigating the PostgreSQL query plan. The row lock on user_billing table during the invoice generation loop is colliding with payment callback updates. Preparing a batch lock reduction patch.",
            created_at=now - timedelta(hours=6),
        )
        db.add_all([c1, c2])

        act1 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item1.id,
            actor_id=mgr_ops.id,
            action=ActivityAction.CREATED.value,
            details={"title": item1.title, "priority": item1.priority, "status": "open"},
            created_at=item1.created_at,
        )
        act2 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item1.id,
            actor_id=mgr_eng.id,
            action=ActivityAction.ASSIGNED.value,
            details={"old_assignee_id": None, "new_assignee_id": dev_priya.id},
            created_at=now - timedelta(days=1, hours=10),
        )
        act3 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item1.id,
            actor_id=dev_priya.id,
            action=ActivityAction.STATUS_CHANGED.value,
            details={"old_status": "open", "new_status": "in_progress", "note": "Started working on database deadlock reproduction."},
            created_at=now - timedelta(hours=8),
        )
        db.add_all([act1, act2, act3])

        # For NEWT-1002 (Awaiting Approval)
        item2 = work_items[1]
        act4 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item2.id,
            actor_id=ops_carlos.id,
            action=ActivityAction.CREATED.value,
            details={"title": item2.title, "priority": item2.priority, "status": "open"},
            created_at=item2.created_at,
        )
        act5 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item2.id,
            actor_id=dev_priya.id,
            action=ActivityAction.STATUS_CHANGED.value,
            details={"old_status": "open", "new_status": "awaiting_approval", "note": "Reconciliation completed. Requires Elena (Manager) approval to adjust settlement ledger."},
            created_at=now - timedelta(hours=2),
        )
        c3 = Comment(
            id=str(uuid.uuid4()),
            work_item_id=item2.id,
            author_id=dev_priya.id,
            content="Bank statement reconciliation report has been generated. The EUR 4,120 discrepancy was due to an intermediary currency exchange fee deduction by Commerzbank. Ready for manager sign-off.",
            created_at=now - timedelta(hours=2),
        )
        db.add_all([act4, act5, c3])

        # For NEWT-1006 (Blocked)
        item6 = work_items[5]
        act6 = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item6.id,
            actor_id=dev_alex.id,
            action=ActivityAction.STATUS_CHANGED.value,
            details={"old_status": "in_progress", "new_status": "blocked", "note": "Blocked on IT Security team providing the new intermediate CA private key."},
            created_at=now - timedelta(hours=3),
        )
        c4 = Comment(
            id=str(uuid.uuid4()),
            work_item_id=item6.id,
            author_id=dev_alex.id,
            content="Waiting for Infosec to provision the new CSR in AWS Secrets Manager. Once approved, rollover takes 5 minutes.",
            created_at=now - timedelta(hours=3),
        )
        db.add_all([act6, c4])

        db.commit()
        print("Database successfully seeded with realistic operational data:")
        print("  - 7 Users (Admin, 2 Managers, 4 Members)")
        print("  - 4 Teams (Core Engineering, Customer Support, Payments & Billing, Compliance & Legal)")
        print("  - 8 Work items with comments and audit activity logs")
        print("  - Demo credentials: password is 'NewtoniteDemo2026!' for all accounts")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
