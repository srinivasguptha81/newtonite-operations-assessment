from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import UserRole, TeamRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    system_role: Optional[UserRole] = UserRole.MEMBER


class UserUpdateRole(BaseModel):
    system_role: UserRole


class UserBrief(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    system_role: str

    model_config = {"from_attributes": True}


class TeamMembershipBrief(BaseModel):
    team_id: str
    team_name: str
    role: str

    model_config = {"from_attributes": True}


class UserResponse(UserBase):
    id: str
    system_role: str
    is_active: bool
    created_at: datetime
    team_memberships: List[TeamMembershipBrief] = []

    model_config = {"from_attributes": True}
