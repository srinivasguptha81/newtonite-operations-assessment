from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: str
    work_item_id: str
    author_id: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: Optional[UserBrief] = None

    model_config = {"from_attributes": True}
