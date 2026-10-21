import pytest
from sqlalchemy import select, func
from app.models.activity import ActivityLog
from app.models.comment import Comment


def test_audit_records_persisted_for_mutations(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Work Item
    r_create = client.post(
        "/api/v1/work-items",
        headers=headers,
        json={
            "title": "Audit verification item",
            "description": "Checking durable audit trail",
            "reason": "Audit compliance check",
            "team_id": seed_data["team_a"].id,
        },
    )
    assert r_create.status_code == 201
    item_id = r_create.json()["id"]

    # 2. Add Comment
    r_comment = client.post(
        f"/api/v1/work-items/{item_id}/comments",
        headers=headers,
        json={"content": "Initial operational assessment completed."},
    )
    assert r_comment.status_code == 201

    # 3. Check activity log
    r_act = client.get(f"/api/v1/work-items/{item_id}/activity", headers=headers)
    assert r_act.status_code == 200
    activities = r_act.json()
    actions = [a["action"] for a in activities]
    assert "created" in actions
    assert "comment_added" in actions


def test_failed_and_unauthorized_mutations_create_no_audit(client, seed_data, db):
    token_unauthorized = seed_data["tokens"]["member_b"]
    item_a_id = seed_data["item_a"].id

    initial_audit_count = db.execute(
        select(func.count(ActivityLog.id)).where(ActivityLog.work_item_id == item_a_id)
    ).scalar_one()

    # Unauthorized comment attempt -> 403
    r1 = client.post(
        f"/api/v1/work-items/{item_a_id}/comments",
        headers={"Authorization": f"Bearer {token_unauthorized}"},
        json={"content": "Malicious comment"},
    )
    assert r1.status_code == 403

    # Unauthorized status transition attempt -> 403
    r2 = client.post(
        f"/api/v1/work-items/{item_a_id}/transition",
        headers={"Authorization": f"Bearer {token_unauthorized}"},
        json={"status": "in_progress", "version": 1},
    )
    assert r2.status_code == 403

    # Stale version update attempt -> 409
    token_authorized = seed_data["tokens"]["member_a"]
    r3 = client.patch(
        f"/api/v1/work-items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_authorized}"},
        json={"title": "Stale update attempt", "version": 9999},
    )
    assert r3.status_code == 409

    # Verify audit count has NOT increased
    final_audit_count = db.execute(
        select(func.count(ActivityLog.id)).where(ActivityLog.work_item_id == item_a_id)
    ).scalar_one()

    assert final_audit_count == initial_audit_count, "Failed operations must not write audit records!"
