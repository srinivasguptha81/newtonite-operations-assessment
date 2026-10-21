from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_

from app.db.session import get_db
from app.api.deps import get_current_user, get_user_team_ids
from app.models.work_item import WorkItem
from app.models.activity import ActivityLog
from app.models.user import User
from app.schemas.activity import ActivityResponse
from app.schemas.user import UserBrief
from app.services.work_item_service import WorkItemService

router = APIRouter(tags=["Activity and Audit History"])


@router.get("/work-items/{item_id}/activity", response_model=List[ActivityResponse])
def list_item_activity(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists the durable audit history and state transitions for a work item.
    Enforces resource-level team authorization.
    """
    item = db.execute(
        select(WorkItem).where(or_(WorkItem.id == item_id, WorkItem.key == item_id))
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

    WorkItemService.check_user_can_access_item(item, current_user, db)

    activities = db.execute(
        select(ActivityLog)
        .options(joinedload(ActivityLog.actor))
        .where(ActivityLog.work_item_id == item.id)
        .order_by(ActivityLog.created_at.desc())
    ).scalars().all()

    return [
        ActivityResponse(
            id=a.id,
            work_item_id=a.work_item_id,
            actor_id=a.actor_id,
            action=a.action,
            details=a.details or {},
            created_at=a.created_at,
            actor=UserBrief.model_validate(a.actor) if a.actor else None,
        )
        for a in activities
    ]


@router.get("/activities/system", response_model=List[ActivityResponse])
def list_system_activity(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists recent operational activity across teams the user is authorized to see.
    """
    user_team_ids = get_user_team_ids(current_user, db)
    query = (
        select(ActivityLog)
        .join(WorkItem, ActivityLog.work_item_id == WorkItem.id)
        .options(joinedload(ActivityLog.actor))
    )

    if user_team_ids is not None:
        query = query.where(WorkItem.team_id.in_(user_team_ids))

    activities = list(
        db.execute(query.order_by(ActivityLog.created_at.desc()).limit(min(limit, 100))).scalars().all()
    )

    return [
        ActivityResponse(
            id=a.id,
            work_item_id=a.work_item_id,
            actor_id=a.actor_id,
            action=a.action,
            details=a.details or {},
            created_at=a.created_at,
            actor=UserBrief.model_validate(a.actor) if a.actor else None,
        )
        for a in activities
    ]
