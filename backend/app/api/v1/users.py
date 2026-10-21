from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserBrief, UserUpdateRole

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserBrief])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists users in the system."""
    users = db.execute(select(User).order_by(User.full_name.asc())).scalars().all()
    return [UserBrief.model_validate(u) for u in users]


@router.patch("/{user_id}/role", response_model=UserBrief)
def update_user_role(
    user_id: str,
    data: UserUpdateRole,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates a user's system role.
    Strictly restricted to Administrators to prevent privilege escalation.
    """
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Protect against demoting the last admin
    if user.system_role == UserRole.ADMIN.value and data.system_role != UserRole.ADMIN:
        admin_count = db.execute(
            select(User).where(User.system_role == UserRole.ADMIN.value)
        ).scalars().all()
        if len(admin_count) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining administrator."
            )

    user.system_role = data.system_role.value
    db.commit()
    db.refresh(user)
    return UserBrief.model_validate(user)
