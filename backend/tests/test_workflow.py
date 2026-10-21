import pytest


def test_invalid_status_transition_rejected(client, seed_data):
    token_a = seed_data["tokens"]["member_a"]
    item_id = seed_data["item_a"].id

    # Item is in 'open' status. Cannot jump directly to 'resolved'
    response = client.post(
        f"/api/v1/work-items/{item_id}/transition",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "status": "resolved",
            "version": 1,
        },
    )
    assert response.status_code == 422
    assert "Invalid status transition" in response.json()["detail"]


def test_workflow_progression_and_approval_enforcement(client, seed_data):
    token_member = seed_data["tokens"]["member_a"]
    token_manager = seed_data["tokens"]["manager_a"]
    headers_member = {"Authorization": f"Bearer {token_member}"}
    headers_manager = {"Authorization": f"Bearer {token_manager}"}

    # Create new item in Team A
    r_create = client.post(
        "/api/v1/work-items",
        headers=headers_member,
        json={
            "title": "Production certificate renewal",
            "description": "Renew wildcard TLS certificate",
            "reason": "Prevent HTTPS outages",
            "team_id": seed_data["team_a"].id,
        },
    )
    assert r_create.status_code == 201
    item_id = r_create.json()["id"]
    version = r_create.json()["version"]

    # 1. Member moves 'open' -> 'in_progress'
    r1 = client.post(
        f"/api/v1/work-items/{item_id}/transition",
        headers=headers_member,
        json={"status": "in_progress", "version": version, "note": "Started renewal script"},
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "in_progress"
    version = r1.json()["version"]

    # 2. Member moves 'in_progress' -> 'awaiting_approval'
    r2 = client.post(
        f"/api/v1/work-items/{item_id}/transition",
        headers=headers_member,
        json={"status": "awaiting_approval", "version": version, "note": "Certificate uploaded, awaiting sign-off"},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "awaiting_approval"
    version = r2.json()["version"]

    # 3. Regular member tries to self-approve / transition to 'resolved' -> MUST BE FORBIDDEN!
    r3 = client.post(
        f"/api/v1/work-items/{item_id}/transition",
        headers=headers_member,
        json={"status": "resolved", "version": version, "note": "I self-approve this"},
    )
    assert r3.status_code == 403
    assert "Manager or Administrator authorization is required" in r3.json()["detail"]

    # 4. Team Manager approves the transition -> SUCCEEDS!
    r4 = client.post(
        f"/api/v1/work-items/{item_id}/transition",
        headers=headers_manager,
        json={"status": "resolved", "version": version, "note": "Verified certificate validity and CA chain. Approved."},
    )
    assert r4.status_code == 200
    assert r4.json()["status"] == "resolved"

    # 5. Check activity history has recorded the 'approved' action
    r_act = client.get(f"/api/v1/work-items/{item_id}/activity", headers=headers_member)
    assert r_act.status_code == 200
    activities = r_act.json()
    actions = [a["action"] for a in activities]
    assert "approved" in actions
    # Check approval details
    approval_entry = next(a for a in activities if a["action"] == "approved")
    assert approval_entry["details"]["old_status"] == "awaiting_approval"
    assert approval_entry["details"]["new_status"] == "resolved"
