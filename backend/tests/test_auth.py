import pytest
from app.core.config import settings


def test_registration_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@test.com",
            "full_name": "New User",
            "password": "SecurePassword123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["system_role"] == "member"
    assert "password" not in data
    assert "hashed_password" not in data


def test_registration_duplicate_email(client):
    payload = {
        "email": "duplicate@test.com",
        "full_name": "Duplicate User",
        "password": "SecurePassword123!",
    }
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"]


def test_registration_role_elevation_prevented(client):
    # Attempt to send system_role=admin during self-registration
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@test.com",
            "full_name": "Privilege Escalation Attempt",
            "password": "SecurePassword123!",
            "system_role": "admin",
        },
    )
    assert response.status_code == 201
    # System role must remain member!
    assert response.json()["system_role"] == "member"


def test_login_success(client, seed_data):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "member.a@test.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "member.a@test.com"


def test_login_invalid_password(client, seed_data):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "member.a@test.com",
            "password": "WrongPassword!",
        },
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.malformed.jwt"},
    )
    assert response.status_code == 401


def test_me_profile(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "member.a@test.com"
    assert len(data["team_memberships"]) >= 1


def test_bootstrap_admin_rejected_when_admin_exists(client, seed_data):
    # An admin already exists from seed_data
    response = client.post(
        "/api/v1/auth/bootstrap-admin",
        json={
            "email": "secondadmin@test.com",
            "full_name": "Second Admin",
            "password": "SuperSecretPassword123!",
            "bootstrap_secret": settings.ADMIN_BOOTSTRAP_SECRET,
        },
    )
    assert response.status_code == 400
    assert "permanently disabled" in response.json()["detail"].lower()
