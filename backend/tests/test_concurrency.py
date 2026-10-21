import concurrent.futures
import pytest


def test_stale_update_rejected_with_conflict(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    item_id = seed_data["item_a"].id
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First client updates item from version 1 -> 2
    r1 = client.patch(
        f"/api/v1/work-items/{item_id}",
        headers=headers,
        json={
            "title": "Payment gateway timeout bug - Investigating",
            "version": 1,
        },
    )
    assert r1.status_code == 200
    assert r1.json()["version"] == 2
    assert r1.json()["title"] == "Payment gateway timeout bug - Investigating"

    # 2. Second client (or stale browser tab) attempts update still sending version 1
    r2 = client.patch(
        f"/api/v1/work-items/{item_id}",
        headers=headers,
        json={
            "title": "Overwriting from stale browser tab",
            "version": 1,
        },
    )
    assert r2.status_code == 409
    error_data = r2.json()
    assert "Conflict" in error_data["detail"]
    assert "current version 2" in error_data["detail"]
    assert r2.headers.get("X-Current-Version") == "2"

    # 3. Third update providing the fresh version (2) succeeds
    r3 = client.patch(
        f"/api/v1/work-items/{item_id}",
        headers=headers,
        json={
            "title": "Fresh update after reconciling conflict",
            "version": 2,
        },
    )
    assert r3.status_code == 200
    assert r3.json()["version"] == 3


def test_concurrent_updates_race_condition_protection(client, seed_data):
    """
    Tests simultaneous overlapping updates against the same work item.
    Proves that atomic database updates prevent lost updates:
    one request succeeds (200), and overlapping stale requests receive 409 Conflict.
    """
    token = seed_data["tokens"]["member_a"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a fresh work item for this concurrency test
    create_resp = client.post(
        "/api/v1/work-items",
        headers=headers,
        json={
            "title": "Concurrent race test item",
            "description": "Testing atomic version update",
            "reason": "Verify race condition safety",
            "team_id": seed_data["team_a"].id,
            "priority": "medium",
        },
    )
    assert create_resp.status_code == 201
    item_id = create_resp.json()["id"]
    initial_version = create_resp.json()["version"]
    assert initial_version == 1

    def make_competing_update(update_id: int):
        # Every competitor sends expected version 1
        return client.patch(
            f"/api/v1/work-items/{item_id}",
            headers=headers,
            json={
                "title": f"Updated by competitor #{update_id}",
                "version": initial_version,
            },
        )

    # Fire 5 concurrent requests simultaneously
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_competing_update, i) for i in range(5)]
        responses = [f.result() for f in futures]

    status_codes = [r.status_code for r in responses]
    successes = [code for code in status_codes if code == 200]
    conflicts = [code for code in status_codes if code == 409]

    # Exactly ONE update must succeed, and all other 4 must be rejected with 409 Conflict!
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {status_codes}"
    assert len(conflicts) == 4, f"Expected 4 conflicts, got {len(conflicts)}: {status_codes}"

    # Verify database final state
    final_resp = client.get(f"/api/v1/work-items/{item_id}", headers=headers)
    assert final_resp.status_code == 200
    assert final_resp.json()["version"] == 2
