import uuid
import pytest
from sqlalchemy import select, func
from app.models.work_item import WorkItem


def test_idempotent_creation_success_and_replay(client, seed_data, db):
    token = seed_data["tokens"]["member_a"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"idemp-key-{uuid.uuid4()}",
    }
    payload = {
        "title": "Idempotent payment discrepancy report",
        "description": "EUR 200 variance in ledger",
        "reason": "Payment reconciliation audit",
        "category": "payment_investigation",
        "priority": "high",
        "team_id": seed_data["team_a"].id,
    }

    initial_count = db.execute(select(func.count(WorkItem.id))).scalar_one()

    # 1. First request creates work item
    r1 = client.post("/api/v1/work-items", headers=headers, json=payload)
    assert r1.status_code == 201
    item1_data = r1.json()
    item1_id = item1_data["id"]

    # 2. Retry identical request with same Idempotency-Key
    r2 = client.post("/api/v1/work-items", headers=headers, json=payload)
    assert r2.status_code == 201
    assert r2.headers.get("X-Cache") == "IDEMPOTENT-HIT"
    item2_data = r2.json()
    assert item2_data["id"] == item1_id
    assert item2_data["title"] == payload["title"]

    # 3. Verify database count increased by ONLY 1
    new_count = db.execute(select(func.count(WorkItem.id))).scalar_one()
    assert new_count == initial_count + 1


def test_idempotency_key_payload_mismatch_conflict(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    key = f"mismatch-key-{uuid.uuid4()}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": key,
    }
    original_payload = {
        "title": "Original request payload",
        "description": "Testing payload mismatch protection",
        "reason": "Verify conflict on modified payload",
        "category": "operational_task",
        "priority": "low",
        "team_id": seed_data["team_a"].id,
    }

    r1 = client.post("/api/v1/work-items", headers=headers, json=original_payload)
    assert r1.status_code == 201

    # Client reuses same Idempotency-Key with different payload
    modified_payload = {
        "title": "Completely different request payload with reused key",
        "description": "Attempting payload spoofing",
        "reason": "Verify rejection",
        "category": "compliance_request",
        "priority": "critical",
        "team_id": seed_data["team_a"].id,
    }

    r2 = client.post("/api/v1/work-items", headers=headers, json=modified_payload)
    assert r2.status_code == 409
    assert "different request payload" in r2.json()["detail"]
