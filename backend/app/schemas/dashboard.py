from typing import List
from pydantic import BaseModel
from app.schemas.work_item import WorkItemResponse
from app.schemas.activity import ActivityResponse


class DashboardStats(BaseModel):
    total_open: int
    critical_count: int
    high_count: int
    overdue_count: int
    blocked_count: int
    awaiting_approval_count: int
    my_assigned_count: int


class DashboardSummary(BaseModel):
    stats: DashboardStats
    urgent_items: List[WorkItemResponse]
    awaiting_approval_items: List[WorkItemResponse]
    recent_activity: List[ActivityResponse]
