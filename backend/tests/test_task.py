"""
태스크 CRUD API 테스트 — Phase 2 검증
커버리지: 정상 케이스 + 400/404 에러 케이스
"""

VALID_TASK = {
    "title": "API 명세 작성",
    "description": "swagger 포함",
    "status": "todo",
    "due_at": "2026-05-20T18:00:00Z",
}


# ── 2-06: POST /api/v1/tasks ──────────────────────────────────────────────────

def test_create_task_201(client):
    r = client.post("/api/v1/tasks", json=VALID_TASK)
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == VALID_TASK["title"]
    assert body["description"] == VALID_TASK["description"]
    assert body["status"] == "todo"
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body


def test_create_task_400_empty_title(client):
    r = client.post("/api/v1/tasks", json={"title": ""})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_task_400_date_only_due_at(client):
    r = client.post("/api/v1/tasks", json={"title": "test", "due_at": "2026-05-20"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ── 2-07: GET /api/v1/tasks ───────────────────────────────────────────────────

def test_list_tasks_200(client):
    client.post("/api/v1/tasks", json=VALID_TASK)
    r = client.get("/api/v1/tasks")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    # 목록 응답에는 description 필드가 없어야 함
    assert "description" not in items[0]


def test_list_tasks_filter_by_status(client):
    client.post("/api/v1/tasks", json={**VALID_TASK, "status": "todo"})
    client.post("/api/v1/tasks", json={**VALID_TASK, "title": "다른 태스크", "status": "done"})
    r = client.get("/api/v1/tasks?status=todo")
    assert r.status_code == 200
    assert all(item["status"] == "todo" for item in r.json())


# ── 2-08: GET /api/v1/tasks/{id} ─────────────────────────────────────────────

def test_get_task_200(client):
    created = client.post("/api/v1/tasks", json=VALID_TASK).json()
    r = client.get(f"/api/v1/tasks/{created['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == created["id"]
    # 단건 응답에는 description 필드가 있어야 함
    assert "description" in body
    assert body["description"] == VALID_TASK["description"]


def test_get_task_404(client):
    r = client.get("/api/v1/tasks/nonexistent-id")
    assert r.status_code == 404


# ── 2-09: PUT /api/v1/tasks/{id} ─────────────────────────────────────────────

def test_update_task_partial_200(client):
    created = client.post("/api/v1/tasks", json=VALID_TASK).json()
    r = client.put(f"/api/v1/tasks/{created['id']}", json={"status": "in_progress"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "in_progress"
    # 전송하지 않은 필드 유지 확인
    assert body["title"] == VALID_TASK["title"]


def test_update_task_404(client):
    r = client.put("/api/v1/tasks/nonexistent-id", json={"status": "done"})
    assert r.status_code == 404


# ── 2-10: DELETE /api/v1/tasks/{id} ──────────────────────────────────────────

def test_delete_task_204(client):
    created = client.post("/api/v1/tasks", json=VALID_TASK).json()
    r = client.delete(f"/api/v1/tasks/{created['id']}")
    assert r.status_code == 204
    assert r.text == ""


def test_delete_then_get_404(client):
    created = client.post("/api/v1/tasks", json=VALID_TASK).json()
    client.delete(f"/api/v1/tasks/{created['id']}")
    r = client.get(f"/api/v1/tasks/{created['id']}")
    assert r.status_code == 404


def test_delete_task_404(client):
    r = client.delete("/api/v1/tasks/nonexistent-id")
    assert r.status_code == 404
