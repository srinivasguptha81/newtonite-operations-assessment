import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func, or_, and_

from app.models.work_item import WorkItem
from app.models.team import Team, TeamMembership
from app.models.user import User
from app.models.activity import ActivityLog
from app.models.idempotency import IdempotencyRecord
from app.models.enums import (
    WorkItemStatus,
    WorkItemPriority,
    WorkItemCategory,
    ActivityAction,
    UserRole,
    TeamRole,
)
from app.schemas.work_item import (
    WorkItemCreate,
    WorkItemUpdate,
    WorkItemAssign,
    WorkItemStatusTransition,
)

# Explicit allowed state transitions
ALLOWED_TRANSITIONS = {
    WorkItemStatus.OPEN.value: {
        WorkItemStatus.IN_PROGRESS.value,
        WorkItemStatus.BLOCKED.value,
        WorkItemStatus.AWAITING_APPROVAL.value,
        WorkItemStatus.CLOSED.value,
    },
    WorkItemStatus.IN_PROGRESS.value: {
        WorkItemStatus.BLOCKED.value,
        WorkItemStatus.AWAITING_APPROVAL.value,
        WorkItemStatus.RESOLVED.value,
        WorkItemStatus.CLOSED.value,
    },
    WorkItemStatus.BLOCKED.value: {
        WorkItemStatus.IN_PROGRESS.value,
        WorkItemStatus.OPEN.value,
        WorkItemStatus.CLOSED.value,
    },
    WorkItemStatus.AWAITING_APPROVAL.value: {
        WorkItemStatus.IN_PROGRESS.value,
        WorkItemStatus.RESOLVED.value,
        WorkItemStatus.OPEN.value,
        WorkItemStatus.CLOSED.value,
    },
    WorkItemStatus.RESOLVED.value: {
        WorkItemStatus.CLOSED.value,
        WorkItemStatus.OPEN.value,
    },
    WorkItemStatus.CLOSED.value: {
        WorkItemStatus.OPEN.value,
    },
}


class WorkItemService:
    @staticmethod
    def _generate_item_key(db: Session) -> str:
        """Generates a human-readable unique item key, e.g. NEWT-1001"""
        count = db.execute(select(func.count(WorkItem.id))).scalar_one()
        return f"NEWT-{1000 + count + 1}"

    @staticmethod
    def check_user_can_access_item(
        item: WorkItem,
        user: User,
        db: Session,
        require_manager: bool = False,
    ) -> Optional[TeamMembership]:
        """
        Enforces team-level resource authorization.
        Admin users have full cross-team oversight.
        Regular users MUST be a member of the item's team.
        """
        if user.is_admin():
            return None

        membership = db.execute(
            select(TeamMembership).where(
                TeamMembership.team_id == item.team_id,
                TeamMembership.user_id == user.id,
            )
        ).scalar_one_or_none()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Resource Access Denied: You do not have permission to view or manage work items for this team.",
            )

        if require_manager and membership.role != TeamRole.MANAGER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager authorization required for this operation on the work item.",
            )

        return membership

    @staticmethod
    def create_work_item(
        db: Session,
        creator: User,
        data: WorkItemCreate,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[WorkItem, bool]:
        """
        Creates a work item with:
        1. Team authorization check
        2. Assignee team membership check
        3. Idempotent request handling and payload mismatch detection
        4. Atomic transaction with ActivityLog
        Returns (work_item, is_idempotent_replay)
        """
        # 1. Authorize creator has access to target team
        if not creator.is_admin():
            membership = db.execute(
                select(TeamMembership).where(
                    TeamMembership.team_id == data.team_id,
                    TeamMembership.user_id == creator.id,
                )
            ).scalar_one_or_none()
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot create work item for a team you do not belong to.",
                )

        # 2. If assignee is specified, verify assignee belongs to the team
        if data.assignee_id:
            assignee_membership = db.execute(
                select(TeamMembership).where(
                    TeamMembership.team_id == data.team_id,
                    TeamMembership.user_id == data.assignee_id,
                )
            ).scalar_one_or_none()
            if not assignee_membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee must be an active member of the assigned team.",
                )

        # 3. Handle Idempotency
        payload_dict = data.model_dump(mode="json")
        canonical_payload = json.dumps(payload_dict, sort_keys=True)
        payload_hash = hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()

        if idempotency_key:
            existing_record = db.execute(
                select(IdempotencyRecord).where(
                    IdempotencyRecord.user_id == creator.id,
                    IdempotencyRecord.idempotency_key == idempotency_key,
                )
            ).scalar_one_or_none()

            if existing_record:
                if existing_record.request_hash != payload_hash:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Conflict: Idempotency-Key reused with a different request payload.",
                    )
                # Fetch previously created work item
                try:
                    resp_data = json.loads(existing_record.response_body)
                    cached_item_id = resp_data.get("id")
                    if cached_item_id:
                        cached_item = db.execute(
                            select(WorkItem).where(WorkItem.id == cached_item_id)
                        ).scalar_one_or_none()
                        if cached_item:
                            return cached_item, True
                except Exception:
                    pass

        # 4. Create Work Item and Activity Log atomically
        item_key = WorkItemService._generate_item_key(db)
        work_item = WorkItem(
            id=str(uuid.uuid4()),
            key=item_key,
            title=data.title,
            description=data.description,
            reason=data.reason,
            category=data.category.value,
            priority=data.priority.value,
            status=WorkItemStatus.OPEN.value,
            team_id=data.team_id,
            creator_id=creator.id,
            assignee_id=data.assignee_id,
            due_date=data.due_date,
            version=1,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(work_item)
        db.flush()  # populate work_item.id

        activity = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=work_item.id,
            actor_id=creator.id,
            action=ActivityAction.CREATED.value,
            details={
                "title": work_item.title,
                "priority": work_item.priority,
                "status": work_item.status,
                "team_id": work_item.team_id,
            },
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)

        # If idempotency key provided, record it in the same transaction
        if idempotency_key:
            response_json = json.dumps({"id": work_item.id, "key": work_item.key})
            idempotency_rec = IdempotencyRecord(
                id=str(uuid.uuid4()),
                user_id=creator.id,
                idempotency_key=idempotency_key,
                request_path="/api/v1/work-items",
                request_hash=payload_hash,
                response_code=201,
                response_body=response_json,
                created_at=datetime.now(timezone.utc),
            )
            db.add(idempotency_rec)

        db.commit()
        db.refresh(work_item)
        return work_item, False

    @staticmethod
    def update_work_item(
        db: Session,
        item_id: str,
        user: User,
        data: WorkItemUpdate,
    ) -> WorkItem:
        """
        Updates work item fields with optimistic concurrency control.
        Uses single atomic database query:
        UPDATE work_items SET ... version = version + 1 WHERE id = :id AND version = :expected_version
        """
        item = db.execute(select(WorkItem).where(WorkItem.id == item_id)).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

        # Resource-level authorization check
        WorkItemService.check_user_can_access_item(item, user, db)

        # Build update values
        update_vals: Dict[str, Any] = {
            "version": WorkItem.version + 1,
            "updated_at": datetime.now(timezone.utc),
        }
        changes: Dict[str, Any] = {}

        if data.title is not None and data.title != item.title:
            update_vals["title"] = data.title
            changes["title"] = {"old": item.title, "new": data.title}
        if data.description is not None and data.description != item.description:
            update_vals["description"] = data.description
            changes["description"] = {"old": "(edited)", "new": "(edited)"}
        if data.reason is not None and data.reason != item.reason:
            update_vals["reason"] = data.reason
            changes["reason"] = {"old": "(edited)", "new": "(edited)"}
        if data.category is not None and data.category.value != item.category:
            update_vals["category"] = data.category.value
            changes["category"] = {"old": item.category, "new": data.category.value}
        if data.priority is not None and data.priority.value != item.priority:
            update_vals["priority"] = data.priority.value
            changes["priority"] = {"old": item.priority, "new": data.priority.value}
        if data.due_date is not None:
            update_vals["due_date"] = data.due_date
            changes["due_date"] = {"new": str(data.due_date)}

        # Perform atomic update with expected version guard
        stmt = (
            update(WorkItem)
            .where(
                WorkItem.id == item_id,
                WorkItem.version == data.version,
            )
            .values(**update_vals)
        )
        result = db.execute(stmt)

        if result.rowcount == 0:
            # Concurrency conflict detected!
            current_ver = db.execute(
                select(WorkItem.version).where(WorkItem.id == item_id)
            ).scalar_one_or_none()
            if current_ver is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Work item was modified by another user (expected version {data.version}, current version {current_ver}).",
                headers={"X-Current-Version": str(current_ver)},
            )

        # Record activity log in same transaction
        action = ActivityAction.UPDATED.value
        if "priority" in changes and len(changes) == 1:
            action = ActivityAction.PRIORITY_CHANGED.value

        activity = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item_id,
            actor_id=user.id,
            action=action,
            details=changes,
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        # Re-fetch updated item
        updated_item = db.execute(
            select(WorkItem).where(WorkItem.id == item_id)
        ).scalar_one()
        return updated_item

    @staticmethod
    def assign_work_item(
        db: Session,
        item_id: str,
        user: User,
        data: WorkItemAssign,
    ) -> WorkItem:
        """
        Assigns or unassigns work item with team membership and concurrency check.
        """
        item = db.execute(select(WorkItem).where(WorkItem.id == item_id)).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

        # Resource-level authorization
        WorkItemService.check_user_can_access_item(item, user, db)

        # If assignee specified, verify assignee belongs to the team
        if data.assignee_id:
            membership = db.execute(
                select(TeamMembership).where(
                    TeamMembership.team_id == item.team_id,
                    TeamMembership.user_id == data.assignee_id,
                )
            ).scalar_one_or_none()
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot assign item to a user who is not a member of this team.",
                )

        old_assignee_id = item.assignee_id

        # Atomic update with expected version guard
        stmt = (
            update(WorkItem)
            .where(
                WorkItem.id == item_id,
                WorkItem.version == data.version,
            )
            .values(
                assignee_id=data.assignee_id,
                version=WorkItem.version + 1,
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = db.execute(stmt)

        if result.rowcount == 0:
            current_ver = db.execute(
                select(WorkItem.version).where(WorkItem.id == item_id)
            ).scalar_one_or_none()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Work item was modified by another user (expected version {data.version}, current version {current_ver}).",
                headers={"X-Current-Version": str(current_ver)},
            )

        action = ActivityAction.ASSIGNED.value if data.assignee_id else ActivityAction.UNASSIGNED.value
        activity = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item_id,
            actor_id=user.id,
            action=action,
            details={"old_assignee_id": old_assignee_id, "new_assignee_id": data.assignee_id},
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        return db.execute(select(WorkItem).where(WorkItem.id == item_id)).scalar_one()

    @staticmethod
    def transition_status(
        db: Session,
        item_id: str,
        user: User,
        data: WorkItemStatusTransition,
    ) -> WorkItem:
        """
        Validates workflow transitions, approval permissions, and optimistic concurrency.
        """
        item = db.execute(select(WorkItem).where(WorkItem.id == item_id)).scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

        # Resource-level authorization
        membership = WorkItemService.check_user_can_access_item(item, user, db)

        old_status = item.status
        target_status = data.status.value

        if old_status == target_status:
            return item

        # 1. Check allowed state transitions graph
        valid_next_states = ALLOWED_TRANSITIONS.get(old_status, set())
        if target_status not in valid_next_states:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status transition from '{old_status}' to '{target_status}'. Allowed transitions: {sorted(list(valid_next_states))}",
            )

        # 2. Check approval authorization
        # Moving OUT of 'awaiting_approval' to 'in_progress' or 'resolved' requires Manager or Admin!
        is_manager_or_admin = user.is_admin() or (
            membership is not None and membership.role == TeamRole.MANAGER.value
        )

        if old_status == WorkItemStatus.AWAITING_APPROVAL.value:
            if not is_manager_or_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Manager or Administrator authorization is required to approve or transition an item awaiting approval.",
                )

        # Reopening from 'closed' requires Manager or Admin
        if old_status == WorkItemStatus.CLOSED.value and target_status == WorkItemStatus.OPEN.value:
            if not is_manager_or_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Manager or Administrator authorization is required to reopen a closed work item.",
                )

        # Atomic update with expected version guard
        stmt = (
            update(WorkItem)
            .where(
                WorkItem.id == item_id,
                WorkItem.version == data.version,
            )
            .values(
                status=target_status,
                version=WorkItem.version + 1,
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = db.execute(stmt)

        if result.rowcount == 0:
            current_ver = db.execute(
                select(WorkItem.version).where(WorkItem.id == item_id)
            ).scalar_one_or_none()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: Work item was modified by another user (expected version {data.version}, current version {current_ver}).",
                headers={"X-Current-Version": str(current_ver)},
            )

        # Activity action determination
        if old_status == WorkItemStatus.AWAITING_APPROVAL.value and target_status in (
            WorkItemStatus.IN_PROGRESS.value,
            WorkItemStatus.RESOLVED.value,
        ):
            action = ActivityAction.APPROVED.value
        elif old_status == WorkItemStatus.AWAITING_APPROVAL.value and target_status == WorkItemStatus.OPEN.value:
            action = ActivityAction.APPROVAL_REJECTED.value
        else:
            action = ActivityAction.STATUS_CHANGED.value

        activity = ActivityLog(
            id=str(uuid.uuid4()),
            work_item_id=item_id,
            actor_id=user.id,
            action=action,
            details={
                "old_status": old_status,
                "new_status": target_status,
                "note": data.note,
            },
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        return db.execute(select(WorkItem).where(WorkItem.id == item_id)).scalar_one()
