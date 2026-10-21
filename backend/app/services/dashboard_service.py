from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_, or_

from app.models.work_item import WorkItem
from app.models.activity import ActivityLog
from app.models.team import TeamMembership
from app.models.user import User
from app.models.enums import WorkItemStatus, WorkItemPriority
from app.schemas.dashboard import DashboardStats, DashboardSummary


class DashboardService:
    @staticmethod
    def get_dashboard_summary(
        db: Session,
        user: User,
        team_id: Optional[str] = None
    ) -> DashboardSummary:
        now = datetime.now(timezone.utc)
        
        # Build base filter according to user team authorization
        filters = []
        if not user.is_admin():
            user_teams_subquery = (
                select(TeamMembership.team_id)
                .where(TeamMembership.user_id == user.id)
            )
            filters.append(WorkItem.team_id.in_(user_teams_subquery))
            
        if team_id:
            filters.append(WorkItem.team_id == team_id)

        open_statuses = [
            WorkItemStatus.OPEN.value,
            WorkItemStatus.IN_PROGRESS.value,
            WorkItemStatus.BLOCKED.value,
            WorkItemStatus.AWAITING_APPROVAL.value,
        ]

        # 1. Total Open Work
        total_open = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status.in_(open_statuses))
        ).scalar_one()

        # 2. Critical items
        critical_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status.in_(open_statuses), WorkItem.priority == WorkItemPriority.CRITICAL.value)
        ).scalar_one()

        # 3. High items
        high_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status.in_(open_statuses), WorkItem.priority == WorkItemPriority.HIGH.value)
        ).scalar_one()

        # 4. Overdue items (due_date < now and not closed/resolved)
        overdue_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status.in_(open_statuses), WorkItem.due_date.is_not(None), WorkItem.due_date < now)
        ).scalar_one()

        # 5. Blocked items
        blocked_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status == WorkItemStatus.BLOCKED.value)
        ).scalar_one()

        # 6. Awaiting approval
        awaiting_approval_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status == WorkItemStatus.AWAITING_APPROVAL.value)
        ).scalar_one()

        # 7. My assigned items
        my_assigned_count = db.execute(
            select(func.count(WorkItem.id))
            .where(*filters, WorkItem.status.in_(open_statuses), WorkItem.assignee_id == user.id)
        ).scalar_one()

        stats = DashboardStats(
            total_open=total_open,
            critical_count=critical_count,
            high_count=high_count,
            overdue_count=overdue_count,
            blocked_count=blocked_count,
            awaiting_approval_count=awaiting_approval_count,
            my_assigned_count=my_assigned_count,
        )

        # Urgent items query (Critical/High, ordered by priority desc, updated_at desc, limit 5)
        urgent_stmt = (
            select(WorkItem)
            .options(
                joinedload(WorkItem.team),
                joinedload(WorkItem.creator),
                joinedload(WorkItem.assignee),
            )
            .where(
                *filters,
                WorkItem.status.in_(open_statuses),
                WorkItem.priority.in_([WorkItemPriority.CRITICAL.value, WorkItemPriority.HIGH.value])
            )
            .order_by(WorkItem.created_at.desc())
            .limit(5)
        )
        urgent_items = list(db.execute(urgent_stmt).scalars().all())

        # Awaiting approval query (limit 5)
        approval_stmt = (
            select(WorkItem)
            .options(
                joinedload(WorkItem.team),
                joinedload(WorkItem.creator),
                joinedload(WorkItem.assignee),
            )
            .where(*filters, WorkItem.status == WorkItemStatus.AWAITING_APPROVAL.value)
            .order_by(WorkItem.updated_at.desc())
            .limit(5)
        )
        awaiting_approval_items = list(db.execute(approval_stmt).scalars().all())

        # Recent activities (limit 8)
        activity_stmt = (
            select(ActivityLog)
            .join(WorkItem, ActivityLog.work_item_id == WorkItem.id)
            .options(joinedload(ActivityLog.actor))
            .where(*filters)
            .order_by(ActivityLog.created_at.desc())
            .limit(8)
        )
        recent_activity = list(db.execute(activity_stmt).scalars().all())

        return DashboardSummary(
            stats=stats,
            urgent_items=urgent_items,
            awaiting_approval_items=awaiting_approval_items,
            recent_activity=recent_activity,
        )
