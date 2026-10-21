import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest, BootstrapAdminRequest, TokenResponse, UserSummary
from app.schemas.user import UserCreate


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.execute(select(User).where(User.email == email.lower().strip())).scalar_one_or_none()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive.",
            )
        return user

    @staticmethod
    def register_user(db: Session, data: UserCreate) -> User:
        existing = db.execute(select(User).where(User.email == data.email.lower().strip())).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )
        
        # Security: Self-registration ALWAYS defaults to regular member role.
        # System Admin role CANNOT be acquired via self-registration.
        user = User(
            id=str(uuid.uuid4()),
            email=data.email.lower().strip(),
            full_name=data.full_name.strip(),
            hashed_password=get_password_hash(data.password),
            system_role=UserRole.MEMBER.value,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def bootstrap_first_admin(db: Session, data: BootstrapAdminRequest) -> User:
        """
        Secure first-administrator bootstrap procedure.
        Only succeeds if NO administrator currently exists in the database.
        Once an admin is established, this endpoint is permanently locked.
        """
        if data.bootstrap_secret != settings.ADMIN_BOOTSTRAP_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid bootstrap secret token.",
            )

        admin_exists = db.execute(
            select(User).where(User.system_role == UserRole.ADMIN.value)
        ).scalar_one_or_none()

        if admin_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrator account has already been bootstrapped. This endpoint is permanently disabled.",
            )

        existing_user = db.execute(
            select(User).where(User.email == data.email.lower().strip())
        ).scalar_one_or_none()

        if existing_user:
            # Promote existing user
            existing_user.system_role = UserRole.ADMIN.value
            existing_user.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_user)
            return existing_user

        admin_user = User(
            id=str(uuid.uuid4()),
            email=data.email.lower().strip(),
            full_name=data.full_name.strip(),
            hashed_password=get_password_hash(data.password),
            system_role=UserRole.ADMIN.value,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        return admin_user
