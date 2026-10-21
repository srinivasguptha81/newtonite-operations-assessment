from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"


class TeamRole(str, Enum):
    MANAGER = "manager"
    MEMBER = "member"


class WorkItemCategory(str, Enum):
    CUSTOMER_ISSUE = "customer_issue"
    ENGINEERING_PROBLEM = "engineering_problem"
    PAYMENT_INVESTIGATION = "payment_investigation"
    PRODUCTION_INCIDENT = "production_incident"
    COMPLIANCE_REQUEST = "compliance_request"
    OPERATIONAL_TASK = "operational_task"


class WorkItemPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WorkItemStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    AWAITING_APPROVAL = "awaiting_approval"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ActivityAction(str, Enum):
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    TEAM_TRANSFERRED = "team_transferred"
    APPROVED = "approved"
    APPROVAL_REJECTED = "approval_rejected"
    COMMENT_ADDED = "comment_added"
    UPDATED = "updated"
