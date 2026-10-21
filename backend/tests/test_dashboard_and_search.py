import pytest


def test_dashboard_summary_and_counts(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    response = client.get(
        "/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    stats = data["stats"]
    assert "total_open" in stats
    assert "critical_count" in stats
    assert "high_count" in stats
    assert "overdue_count" in stats
    assert "blocked_count" in stats
    assert "awaiting_approval_count" in stats
    assert "my_assigned_count" in stats
    assert "urgent_items" in data
    assert "awaiting_approval_items" in data


def test_work_items_search_and_filtering(client, seed_data):
    token = seed_data["tokens"]["member_a"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search by key
    r_search = client.get("/api/v1/work-items?search=NEWT-101", headers=headers)
    assert r_search.status_code == 200
    items = r_search.json()["items"]
    assert len(items) >= 1
    assert any(i["key"] == "NEWT-101" for i in items)

    # Filter by priority
    r_prio = client.get("/api/v1/work-items?priority=high", headers=headers)
    assert r_prio.status_code == 200
    for item in r_prio.json()["items"]:
        assert item["priority"] == "high"

    # Filter by status
    r_status = client.get("/api/v1/work-items?status=open", headers=headers)
    assert r_status.status_code == 200
    for item in r_status.json()["items"]:
        assert item["status"] == "open"


def test_work_items_pagination(client, seed_data):
    token = seed_data["tokens"]["admin"]
    headers = {"Authorization": f"Bearer {token}"}

    # Page size 2
    r_page = client.get("/api/v1/work-items?page=1&page_size=2", headers=headers)
    assert r_page.status_code == 200
    data = r_page.json()
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert len(data["items"]) <= 2
    assert "total" in data
    assert "total_pages" in data
