from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel
from app.schemas.user import UserBrief


class ActivityResponse(BaseModel):
    id: str
    work_item_id: str
    actor_id: str
    action: str
    details: Dict[str, Any] = {}
    created_at: datetime
    actor: Optional[UserBrief] = None

    model_config = {"from_attributes": True}
