import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.enums import WorkItemCategory, WorkItemPriority, WorkItemStatus


class WorkItem(Base):
    __tablename__ = "work_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    category: Mapped[str] = mapped_column(
        String(50),
        default=WorkItemCategory.OPERATIONAL_TASK.value,
        nullable=False,
        index=True
    )
    priority: Mapped[str] = mapped_column(
        String(50),
        default=WorkItemPriority.MEDIUM.value,
        nullable=False,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=WorkItemStatus.OPEN.value,
        nullable=False,
        index=True
    )
    
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assignee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    
    # Concurrency control: starts at 1, incremented atomically on every update
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Composite indexes for fast dashboard and search queries
    __table_args__ = (
        Index("idx_workitem_team_status", "team_id", "status"),
        Index("idx_workitem_status_priority", "status", "priority"),
        Index("idx_workitem_assignee_status", "assignee_id", "status"),
    )

    # Relationships
    team = relationship("Team", back_populates="work_items")
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_work_items")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_work_items")
    comments = relationship("Comment", back_populates="work_item", cascade="all, delete-orphan", order_by="Comment.created_at.asc()")
    activities = relationship("ActivityLog", back_populates="work_item", cascade="all, delete-orphan", order_by="ActivityLog.created_at.desc()")
