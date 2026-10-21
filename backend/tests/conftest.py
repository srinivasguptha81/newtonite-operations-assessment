import os
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Ensure test DB environment
os.environ["DATABASE_URL"] = "sqlite:///./test_newtonite.db"
os.environ["ENVIRONMENT"] = "testing"

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.team import Team, TeamMembership
from app.models.work_item import WorkItem
from app.models.enums import UserRole, TeamRole, WorkItemPriority, WorkItemStatus, WorkItemCategory

TEST_DB_URL = "sqlite:///./test_newtonite.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# expire_on_commit=False prevents DetachedInstanceError when accessing object attributes
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=test_engine
)

# Precompute password hash once to make the test suite lightning fast
TEST_PASSWORD_HASH = get_password_hash("Password123!")


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def clean_database():
    """Ensures each test starts with a fresh, clean database."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seed_data():
    """Seeds a fresh test environment with 2 teams and users across roles."""
    session = TestingSessionLocal()
    now = datetime.now(timezone.utc)

    # Teams
    team_a = Team(
        id=str(uuid.uuid4()),
        name="Team Alpha",
        slug="team-alpha",
        description="Engineering and platform systems",
        is_active=True,
    )
    team_b = Team(
        id=str(uuid.uuid4()),
        name="Team Beta",
        slug="team-beta",
        description="Operations and customer triage",
        is_active=True,
    )
    session.add_all([team_a, team_b])
    session.flush()

    # Users
    admin = User(
        id=str(uuid.uuid4()),
        email="admin@test.com",
        full_name="Admin User",
        hashed_password=TEST_PASSWORD_HASH,
        system_role=UserRole.ADMIN.value,
        is_active=True,
    )
    manager_a = User(
        id=str(uuid.uuid4()),
        email="manager.a@test.com",
        full_name="Manager Alpha",
        hashed_password=TEST_PASSWORD_HASH,
        system_role=UserRole.MANAGER.value,
        is_active=True,
    )
    member_a = User(
        id=str(uuid.uuid4()),
        email="member.a@test.com",
        full_name="Member Alpha",
        hashed_password=TEST_PASSWORD_HASH,
        system_role=UserRole.MEMBER.value,
        is_active=True,
    )
    member_b = User(
        id=str(uuid.uuid4()),
        email="member.b@test.com",
        full_name="Member Beta",
        hashed_password=TEST_PASSWORD_HASH,
        system_role=UserRole.MEMBER.value,
        is_active=True,
    )
    session.add_all([admin, manager_a, member_a, member_b])
    session.flush()

    # Memberships
    m1 = TeamMembership(id=str(uuid.uuid4()), team_id=team_a.id, user_id=manager_a.id, role=TeamRole.MANAGER.value)
    m2 = TeamMembership(id=str(uuid.uuid4()), team_id=team_a.id, user_id=member_a.id, role=TeamRole.MEMBER.value)
    m3 = TeamMembership(id=str(uuid.uuid4()), team_id=team_b.id, user_id=member_b.id, role=TeamRole.MEMBER.value)
    session.add_all([m1, m2, m3])
    session.flush()

    # Work Item in Team A
    item_a = WorkItem(
        id=str(uuid.uuid4()),
        key="NEWT-101",
        title="Payment gateway timeout bug",
        description="Transactions are timing out on checkout endpoint.",
        reason="Prevent customer checkout dropoff.",
        category=WorkItemCategory.PAYMENT_INVESTIGATION.value,
        priority=WorkItemPriority.HIGH.value,
        status=WorkItemStatus.OPEN.value,
        team_id=team_a.id,
        creator_id=member_a.id,
        assignee_id=member_a.id,
        version=1,
    )
    session.add(item_a)
    session.commit()

    tokens = {
        "admin": create_access_token(admin.id, admin.system_role),
        "manager_a": create_access_token(manager_a.id, manager_a.system_role),
        "member_a": create_access_token(member_a.id, member_a.system_role),
        "member_b": create_access_token(member_b.id, member_b.system_role),
    }

    data = {
        "team_a": team_a,
        "team_b": team_b,
        "admin": admin,
        "manager_a": manager_a,
        "member_a": member_a,
        "member_b": member_b,
        "item_a": item_a,
        "tokens": tokens,
    }

    session.close()
    return data
