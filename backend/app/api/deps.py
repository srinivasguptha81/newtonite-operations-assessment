from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.team import TeamMembership
from app.models.enums import UserRole, TeamRole

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user


def get_user_team_ids(user: User, db: Session) -> Optional[List[str]]:
    """
    Returns None if user is an Administrator (meaning unbounded visibility).
    Returns list of team_ids if normal user.
    """
    if user.is_admin():
        return None
    stmt = select(TeamMembership.team_id).where(TeamMembership.user_id == user.id)
    return list(db.execute(stmt).scalars().all())


def verify_user_team_membership(
    team_id: str,
    user: User,
    db: Session,
    require_manager: bool = False
) -> Optional[TeamMembership]:
    """
    Verifies that the user has access to the specified team.
    Admin users bypass this check.
    If require_manager is True, verifies that the user is either Admin or a Manager in that team.
    """
    if user.is_admin():
        return None  # Admin has access without explicit membership
    
    membership = db.execute(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user.id
        )
    ).scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You are not a member of the team assigned to this resource"
        )
    
    if require_manager and membership.role != TeamRole.MANAGER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager authorization required for this team operation"
        )
    
    return membership
