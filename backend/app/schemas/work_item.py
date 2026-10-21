from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import WorkItemCategory, WorkItemPriority, WorkItemStatus
from app.schemas.user import UserBrief


class TeamBrief(BaseModel):
    id: str
    name: str
    slug: str

    model_config = {"from_attributes": True}


class WorkItemBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    reason: str = Field(..., min_length=5)
    category: WorkItemCategory = WorkItemCategory.OPERATIONAL_TASK
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    due_date: Optional[datetime] = None


class WorkItemCreate(WorkItemBase):
    team_id: str
    assignee_id: Optional[str] = None


class WorkItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=5)
    reason: Optional[str] = Field(None, min_length=5)
    category: Optional[WorkItemCategory] = None
    priority: Optional[WorkItemPriority] = None
    due_date: Optional[datetime] = None
    version: int = Field(..., description="Expected current version for optimistic concurrency control")


class WorkItemAssign(BaseModel):
    assignee_id: Optional[str] = None
    version: int = Field(..., description="Expected current version for optimistic concurrency control")


class WorkItemStatusTransition(BaseModel):
    status: WorkItemStatus
    version: int = Field(..., description="Expected current version for optimistic concurrency control")
    note: Optional[str] = Field(None, description="Reason or approval explanation")


class WorkItemResponse(WorkItemBase):
    id: str
    key: str
    status: WorkItemStatus
    team_id: str
    creator_id: str
    assignee_id: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime
    
    # Enriched relationships
    team: Optional[TeamBrief] = None
    creator: Optional[UserBrief] = None
    assignee: Optional[UserBrief] = None

    model_config = {"from_attributes": True}


class WorkItemListResponse(BaseModel):
    items: List[WorkItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
