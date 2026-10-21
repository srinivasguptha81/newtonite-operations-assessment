from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import create_access_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.team import TeamMembership
from app.schemas.auth import LoginRequest, TokenResponse, BootstrapAdminRequest, UserSummary
from app.schemas.user import UserCreate, UserResponse, TeamMembershipBrief
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user account with default member role."""
    user = AuthService.register_user(db, data)
    return UserSummary.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and returns JWT access token."""
    user = AuthService.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id, role=user.system_role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserSummary.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the authenticated user profile and team memberships."""
    # Load memberships with team names
    memberships = db.execute(
        select(TeamMembership)
        .options(joinedload(TeamMembership.team))
        .where(TeamMembership.user_id == current_user.id)
    ).scalars().all()

    membership_briefs = [
        TeamMembershipBrief(
            team_id=m.team_id,
            team_name=m.team.name if m.team else "Unknown",
            role=m.role
        )
        for m in memberships
    ]

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        system_role=current_user.system_role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        team_memberships=membership_briefs,
    )


@router.post("/bootstrap-admin", response_model=UserSummary)
def bootstrap_admin(data: BootstrapAdminRequest, db: Session = Depends(get_db)):
    """
    Secure one-time bootstrap for the initial administrator.
    Fails if an administrator already exists.
    """
    admin_user = AuthService.bootstrap_first_admin(db, data)
    return UserSummary.model_validate(admin_user)
