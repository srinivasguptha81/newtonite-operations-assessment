import pytest


def test_cross_team_read_forbidden(client, seed_data):
    # Member B is in Team Beta, trying to read Item A in Team Alpha
    token_b = seed_data["tokens"]["member_b"]
    item_a_id = seed_data["item_a"].id

    response = client.get(
        f"/api/v1/work-items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 403
    assert "Resource Access Denied" in response.json()["detail"]


def test_cross_team_update_forbidden(client, seed_data):
    token_b = seed_data["tokens"]["member_b"]
    item_a_id = seed_data["item_a"].id

    response = client.patch(
        f"/api/v1/work-items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Hacked Title", "version": 1},
    )
    assert response.status_code == 403
    assert "Resource Access Denied" in response.json()["detail"]


def test_cross_team_comment_forbidden(client, seed_data):
    token_b = seed_data["tokens"]["member_b"]
    item_a_id = seed_data["item_a"].id

    response = client.post(
        f"/api/v1/work-items/{item_a_id}/comments",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"content": "Unauthorized comment from another team"},
    )
    assert response.status_code == 403
    assert "Resource Access Denied" in response.json()["detail"]


def test_cross_team_assign_forbidden(client, seed_data):
    token_b = seed_data["tokens"]["member_b"]
    item_a_id = seed_data["item_a"].id

    response = client.post(
        f"/api/v1/work-items/{item_a_id}/assign",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"assignee_id": seed_data["member_b"].id, "version": 1},
    )
    assert response.status_code == 403


def test_cross_team_create_forbidden(client, seed_data):
    # Member B attempts to create work item directly assigned to Team Alpha
    token_b = seed_data["tokens"]["member_b"]
    response = client.post(
        "/api/v1/work-items",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "title": "Unauthorized cross team creation",
            "description": "Attempting to create item for Team A",
            "reason": "Test cross team enforcement",
            "team_id": seed_data["team_a"].id,
        },
    )
    assert response.status_code == 403
    assert "Cannot create work item for a team you do not belong to" in response.json()["detail"]


def test_assign_to_user_outside_team_rejected(client, seed_data):
    # Member A attempts to assign Team Alpha's item to Member B (who is only in Team Beta)
    token_a = seed_data["tokens"]["member_a"]
    item_a_id = seed_data["item_a"].id

    response = client.post(
        f"/api/v1/work-items/{item_a_id}/assign",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "assignee_id": seed_data["member_b"].id,
            "version": 1,
        },
    )
    assert response.status_code == 400
    assert "not a member of this team" in response.json()["detail"].lower()


def test_privilege_escalation_role_update_forbidden(client, seed_data):
    token_a = seed_data["tokens"]["member_a"]
    member_a_id = seed_data["member_a"].id

    # Normal member attempts to promote themselves to admin
    response = client.patch(
        f"/api/v1/users/{member_a_id}/role",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"system_role": "admin"},
    )
    assert response.status_code == 403
    assert "Administrative privileges required" in response.json()["detail"]


def test_admin_has_global_oversight(client, seed_data):
    token_admin = seed_data["tokens"]["admin"]
    item_a_id = seed_data["item_a"].id

    response = client.get(
        f"/api/v1/work-items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == item_a_id
