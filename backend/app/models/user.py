import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    system_role: Mapped[str] = mapped_column(String(50), default=UserRole.MEMBER.value, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    team_memberships = relationship("TeamMembership", back_populates="user", cascade="all, delete-orphan")
    created_work_items = relationship("WorkItem", back_populates="creator", foreign_keys="WorkItem.creator_id")
    assigned_work_items = relationship("WorkItem", back_populates="assignee", foreign_keys="WorkItem.assignee_id")
    comments = relationship("Comment", back_populates="author")
    activities = relationship("ActivityLog", back_populates="actor")

    def is_admin(self) -> bool:
        return self.system_role == UserRole.ADMIN.value
