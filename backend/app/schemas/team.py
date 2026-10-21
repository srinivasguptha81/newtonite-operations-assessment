from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import TeamRole
from app.schemas.user import UserBrief


class TeamBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class TeamCreate(TeamBase):
    slug: Optional[str] = None


class TeamResponse(TeamBase):
    id: str
    slug: str
    is_active: bool
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class TeamMembershipCreate(BaseModel):
    user_id: str
    role: TeamRole = TeamRole.MEMBER


class TeamMembershipResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    role: str
    created_at: datetime
    user: UserBrief

    model_config = {"from_attributes": True}


class TeamDetailResponse(TeamResponse):
    memberships: List[TeamMembershipResponse] = []
