from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_, and_

from app.db.session import get_db
from app.api.deps import get_current_user, get_user_team_ids
from app.models.work_item import WorkItem
from app.models.team import TeamMembership
from app.models.user import User
from app.models.enums import WorkItemCategory, WorkItemPriority, WorkItemStatus
from app.schemas.work_item import (
    WorkItemCreate,
    WorkItemUpdate,
    WorkItemAssign,
    WorkItemStatusTransition,
    WorkItemResponse,
    WorkItemListResponse,
)
from app.services.work_item_service import WorkItemService

router = APIRouter(prefix="/work-items", tags=["Work Items"])


@router.post("", response_model=WorkItemResponse, status_code=status.HTTP_201_CREATED)
def create_work_item(
    data: WorkItemCreate,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new operational work item.
    Supports atomic Idempotency-Key deduplication and payload mismatch protection.
    """
    item, is_replay = WorkItemService.create_work_item(
        db=db,
        creator=current_user,
        data=data,
        idempotency_key=idempotency_key,
    )
    if is_replay:
        response.headers["X-Cache"] = "IDEMPOTENT-HIT"

    # Eager load relationships for clean serialization
    refreshed = db.execute(
        select(WorkItem)
        .options(
            joinedload(WorkItem.team),
            joinedload(WorkItem.creator),
            joinedload(WorkItem.assignee),
        )
        .where(WorkItem.id == item.id)
    ).scalar_one()

    return refreshed


@router.get("", response_model=WorkItemListResponse)
def list_work_items(
    team_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    overdue: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves a paginated list of work items with comprehensive filters.
    Strictly bounded by the user's authorized teams unless Administrator.
    """
    user_team_ids = get_user_team_ids(current_user, db)

    query = select(WorkItem).options(
        joinedload(WorkItem.team),
        joinedload(WorkItem.creator),
        joinedload(WorkItem.assignee),
    )

    count_query = select(func.count(WorkItem.id))

    filters = []

    # Team authorization constraint
    if user_team_ids is not None:
        filters.append(WorkItem.team_id.in_(user_team_ids))

    if team_id:
        filters.append(WorkItem.team_id == team_id)

    if status:
        filters.append(WorkItem.status == status)

    if priority:
        filters.append(WorkItem.priority == priority)

    if category:
        filters.append(WorkItem.category == category)

    if assignee_id:
        filters.append(WorkItem.assignee_id == assignee_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                WorkItem.key.ilike(search_pattern),
                WorkItem.title.ilike(search_pattern),
                WorkItem.description.ilike(search_pattern),
            )
        )

    if overdue is True:
        now = datetime.now(timezone.utc)
        filters.append(
            and_(
                WorkItem.due_date.is_not(None),
                WorkItem.due_date < now,
                WorkItem.status.notin_([WorkItemStatus.RESOLVED.value, WorkItemStatus.CLOSED.value]),
            )
        )

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    total = db.execute(count_query).scalar_one()

    # Bounded pagination
    offset = (page - 1) * page_size
    query = query.order_by(WorkItem.updated_at.desc()).offset(offset).limit(page_size)
    items = list(db.execute(query).scalars().all())

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return WorkItemListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{item_id}", response_model=WorkItemResponse)
def get_work_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves work item details by UUID or human-readable key (e.g. NEWT-1001).
    Enforces resource-level team authorization.
    """
    item = db.execute(
        select(WorkItem)
        .options(
            joinedload(WorkItem.team),
            joinedload(WorkItem.creator),
            joinedload(WorkItem.assignee),
        )
        .where(or_(WorkItem.id == item_id, WorkItem.key == item_id))
    ).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

    WorkItemService.check_user_can_access_item(item, current_user, db)
    return item


@router.patch("/{item_id}", response_model=WorkItemResponse)
def update_work_item(
    item_id: str,
    data: WorkItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates work item fields with optimistic concurrency control.
    Atomic DB update checks `WHERE id = :id AND version = :version`.
    Rejects stale edits with HTTP 409 Conflict.
    """
    updated_item = WorkItemService.update_work_item(
        db=db,
        item_id=item_id,
        user=current_user,
        data=data,
    )
    return db.execute(
        select(WorkItem)
        .options(
            joinedload(WorkItem.team),
            joinedload(WorkItem.creator),
            joinedload(WorkItem.assignee),
        )
        .where(WorkItem.id == updated_item.id)
    ).scalar_one()


@router.post("/{item_id}/assign", response_model=WorkItemResponse)
def assign_work_item(
    item_id: str,
    data: WorkItemAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assigns or unassigns work item to a team member with optimistic concurrency control.
    """
    updated_item = WorkItemService.assign_work_item(
        db=db,
        item_id=item_id,
        user=current_user,
        data=data,
    )
    return db.execute(
        select(WorkItem)
        .options(
            joinedload(WorkItem.team),
            joinedload(WorkItem.creator),
            joinedload(WorkItem.assignee),
        )
        .where(WorkItem.id == updated_item.id)
    ).scalar_one()


@router.post("/{item_id}/transition", response_model=WorkItemResponse)
def transition_work_item_status(
    item_id: str,
    data: WorkItemStatusTransition,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Transitions work item status according to explicit workflow rules.
    Enforces Manager/Admin authorization for approvals and reopenings.
    Guarded by optimistic concurrency control.
    """
    updated_item = WorkItemService.transition_status(
        db=db,
        item_id=item_id,
        user=current_user,
        data=data,
    )
    return db.execute(
        select(WorkItem)
        .options(
            joinedload(WorkItem.team),
            joinedload(WorkItem.creator),
            joinedload(WorkItem.assignee),
        )
        .where(WorkItem.id == updated_item.id)
    ).scalar_one()
