import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.work_item import WorkItem
from app.models.comment import Comment
from app.models.activity import ActivityLog
from app.models.user import User
from app.models.enums import ActivityAction
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.user import UserBrief
from app.services.work_item_service import WorkItemService

router = APIRouter(prefix="/work-items", tags=["Comments"])


@router.get("/{item_id}/comments", response_model=List[CommentResponse])
def list_comments(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists comments for a work item in chronological order.
    Enforces resource-level team authorization.
    """
    item = db.execute(
        select(WorkItem).where(or_(WorkItem.id == item_id, WorkItem.key == item_id))
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

    WorkItemService.check_user_can_access_item(item, current_user, db)

    comments = db.execute(
        select(Comment)
        .options(joinedload(Comment.author))
        .where(Comment.work_item_id == item.id)
        .order_by(Comment.created_at.asc())
    ).scalars().all()

    return [
        CommentResponse(
            id=c.id,
            work_item_id=c.work_item_id,
            author_id=c.author_id,
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at,
            author=UserBrief.model_validate(c.author),
        )
        for c in comments
    ]


@router.post("/{item_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    item_id: str,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adds a collaboration comment to a work item.
    Enforces resource-level team authorization and records activity log atomically.
    """
    item = db.execute(
        select(WorkItem).where(or_(WorkItem.id == item_id, WorkItem.key == item_id))
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found.")

    WorkItemService.check_user_can_access_item(item, current_user, db)

    # Atomic creation of Comment and ActivityLog in same transaction
    comment = Comment(
        id=str(uuid.uuid4()),
        work_item_id=item.id,
        author_id=current_user.id,
        content=data.content.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)

    activity = ActivityLog(
        id=str(uuid.uuid4()),
        work_item_id=item.id,
        actor_id=current_user.id,
        action=ActivityAction.COMMENT_ADDED.value,
        details={"comment_snippet": data.content[:100]},
        created_at=datetime.now(timezone.utc),
    )
    db.add(activity)

    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        work_item_id=comment.work_item_id,
        author_id=comment.author_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=UserBrief.model_validate(current_user),
    )
