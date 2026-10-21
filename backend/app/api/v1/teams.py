import uuid
import re
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin, verify_user_team_membership
from app.models.team import Team, TeamMembership
from app.models.user import User
from app.models.enums import TeamRole
from app.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamDetailResponse,
    TeamMembershipCreate,
    TeamMembershipResponse,
)
from app.schemas.user import UserBrief

router = APIRouter(prefix="/teams", tags=["Teams"])


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s


@router.get("", response_model=List[TeamResponse])
def list_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all teams with member counts."""
    teams = db.execute(select(Team).order_by(Team.name.asc())).scalars().all()
    results = []
    for t in teams:
        member_count = db.execute(
            select(func.count(TeamMembership.id)).where(TeamMembership.team_id == t.id)
        ).scalar_one()
        results.append(
            TeamResponse(
                id=t.id,
                name=t.name,
                slug=t.slug,
                description=t.description,
                is_active=t.is_active,
                created_at=t.created_at,
                member_count=member_count,
            )
        )
    return results


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    data: TeamCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Creates a new team (Administrator only)."""
    slug = data.slug or slugify(data.name)
    existing = db.execute(
        select(Team).where((Team.name == data.name) | (Team.slug == slug))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team with this name or slug already exists."
        )

    team = Team(
        id=str(uuid.uuid4()),
        name=data.name.strip(),
        slug=slug,
        description=data.description,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return TeamResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        is_active=team.is_active,
        created_at=team.created_at,
        member_count=0,
    )


@router.get("/{team_id}", response_model=TeamDetailResponse)
def get_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves team details including members."""
    team = db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    memberships = db.execute(
        select(TeamMembership)
        .options(joinedload(TeamMembership.user))
        .where(TeamMembership.team_id == team_id)
    ).scalars().all()

    membership_responses = [
        TeamMembershipResponse(
            id=m.id,
            team_id=m.team_id,
            user_id=m.user_id,
            role=m.role,
            created_at=m.created_at,
            user=UserBrief.model_validate(m.user),
        )
        for m in memberships
    ]

    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        is_active=team.is_active,
        created_at=team.created_at,
        member_count=len(memberships),
        memberships=membership_responses,
    )


@router.post("/{team_id}/members", response_model=TeamMembershipResponse, status_code=status.HTTP_201_CREATED)
def add_team_member(
    team_id: str,
    data: TeamMembershipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds a member to the team.
    Allowed for Administrators or Managers of this team.
    """
    verify_user_team_membership(team_id, current_user, db, require_manager=True)

    team = db.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    target_user = db.execute(select(User).where(User.id == data.user_id)).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

    existing_membership = db.execute(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == data.user_id
        )
    ).scalar_one_or_none()

    if existing_membership:
        existing_membership.role = data.role.value
        db.commit()
        db.refresh(existing_membership)
        return TeamMembershipResponse(
            id=existing_membership.id,
            team_id=existing_membership.team_id,
            user_id=existing_membership.user_id,
            role=existing_membership.role,
            created_at=existing_membership.created_at,
            user=UserBrief.model_validate(target_user),
        )

    membership = TeamMembership(
        id=str(uuid.uuid4()),
        team_id=team_id,
        user_id=data.user_id,
        role=data.role.value,
        created_at=datetime.now(timezone.utc),
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return TeamMembershipResponse(
        id=membership.id,
        team_id=membership.team_id,
        user_id=membership.user_id,
        role=membership.role,
        created_at=membership.created_at,
        user=UserBrief.model_validate(target_user),
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Removes a member from the team.
    Allowed for Administrators or Managers of this team.
    """
    verify_user_team_membership(team_id, current_user, db, require_manager=True)

    membership = db.execute(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id
        )
    ).scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team membership not found.")

    db.delete(membership)
    db.commit()
    return None
