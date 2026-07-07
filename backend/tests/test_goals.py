"""Tests for Goals CRUD with real-time SAW ranking (02-10-PLAN.md Task 2).

Uses an isolated TestClient (bare FastAPI() + goals.router only), matching
the pattern established in test_wallets.py/test_transactions.py. Covers the
4 behavior cases from 02-10-PLAN.md Task 2:
  1. POST with deadline=yesterday -> 422 (deadline-must-be-future validator)
  2. GET /api/goals -> nominal_terkumpul/progress_pct/skor_kepentingan/rank
     all correctly computed, using exactly 4 batched Supabase queries total
     (goal, alokasi, transaksi avg-income, goal_settings) — never N+1
  3. GET /api/goals/{id} additionally includes allocation_history
  4. DELETE /api/goals/{id} blocked (400 GOAL_HAS_ALLOCATIONS) when alokasi
     rows exist; succeeds (204) when none exist
"""

from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import goals
from backend.services import goal_service
from backend.services import goal_settings_service

DEFAULT_WEIGHTS = {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162,
}


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(goals.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[goals.get_current_user_id] = lambda: user_id
    return TestClient(app)


def _patch_supabase(monkeypatch, fake_supabase_client):
    monkeypatch.setattr(goals, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(
        goal_service, "get_supabase_admin", lambda: fake_supabase_client
    )
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: fake_supabase_client
    )


class _CountingSupabaseClient:
    """Wraps a FakeSupabaseClient and counts `.table(...)` invocations, so
    tests can assert the batched-aggregation query count (never N+1),
    matching the pattern established in test_wallets.py."""

    def __init__(self, inner):
        self._inner = inner
        self.table_calls = 0

    def table(self, table_name: str):
        self.table_calls += 1
        return self._inner.table(table_name)


# ---------------------------------------------------------------------------
# POST /api/goals — deadline-must-be-future validator
# ---------------------------------------------------------------------------

def test_post_goal_deadline_in_past_returns_422(monkeypatch, fake_supabase_client):
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    body = {
        "nama_goal": "Beli Laptop",
        "nominal_target": 8000000,
        "deadline": yesterday,
        "skor_keinginan": 5,
    }
    response = client.post("/api/goals", json=body)

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/goals — real SAW ranking, batched aggregation (no N+1)
# ---------------------------------------------------------------------------

def test_get_goals_computes_progress_and_rank_via_exactly_4_batched_queries(
    monkeypatch, fake_supabase_client
):
    far_deadline = (date.today() + timedelta(days=400)).isoformat()
    near_deadline = (date.today() + timedelta(days=20)).isoformat()

    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 8000000,
                "deadline": near_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            },
            {
                "id_goal": "goal-2",
                "id_pengguna": "user-1",
                "nama_goal": "Dana Darurat",
                "nominal_target": 5000000,
                "deadline": far_deadline,
                "skor_keinginan": 3,
                "created_at": "2026-06-02T00:00:00+00:00",
            },
            {
                "id_goal": "goal-3",
                "id_pengguna": "user-2",  # different user — must never leak
                "nama_goal": "Liburan Orang Lain",
                "nominal_target": 1000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-03T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "aloc-1",
                "id_pengguna": "user-1",
                "goal_id": "goal-1",
                "transaksi_id": "tx-1",
                "nominal_alokasi": 3200000,
                "tanggal_alokasi": "2026-06-10T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-side-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 1000000,
                "tanggal_transaksi": date.today().isoformat(),
            },
        ],
    )
    fake_supabase_client.seed(
        "goal_settings",
        [
            {
                "id_pengguna": "user-1",
                "strategy": "quick_win",
                "weights": DEFAULT_WEIGHTS,
            }
        ],
    )

    counting_client = _CountingSupabaseClient(fake_supabase_client)
    monkeypatch.setattr(goals, "get_supabase_admin", lambda: counting_client)
    monkeypatch.setattr(goal_service, "get_supabase_admin", lambda: counting_client)
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: counting_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/goals")

    assert response.status_code == 200
    data = response.json()
    assert len(data["goals"]) == 2  # user-2's goal never leaks

    by_id = {g["id_goal"]: g for g in data["goals"]}
    assert "goal-3" not in by_id

    goal_1 = by_id["goal-1"]
    assert goal_1["nominal_terkumpul"] == 3200000
    assert goal_1["progress_pct"] == 40  # 3200000 / 8000000 * 100
    assert goal_1["skor_kepentingan"] == 5  # near deadline -> max urgency bucket

    goal_2 = by_id["goal-2"]
    assert goal_2["nominal_terkumpul"] == 0
    assert goal_2["progress_pct"] == 0
    assert goal_2["skor_kepentingan"] == 1  # far deadline -> lowest urgency bucket

    # Both goals have a rank assigned by the real SAW engine
    ranks = {g["rank"] for g in data["goals"]}
    assert ranks == {1, 2}

    # Exactly 4 batched Supabase queries: goal, alokasi, transaksi, goal_settings
    assert counting_client.table_calls == 4


# ---------------------------------------------------------------------------
# GET /api/goals/{id} — includes allocation_history
# ---------------------------------------------------------------------------

def test_get_goal_detail_includes_allocation_history(
    monkeypatch, fake_supabase_client
):
    far_deadline = (date.today() + timedelta(days=400)).isoformat()

    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 8000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "aloc-1",
                "id_pengguna": "user-1",
                "goal_id": "goal-1",
                "transaksi_id": "tx-1",
                "nominal_alokasi": 175000,
                "tanggal_alokasi": "2026-06-27T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/goals/goal-1")

    assert response.status_code == 200
    data = response.json()
    assert data["id_goal"] == "goal-1"
    assert len(data["allocation_history"]) == 1
    assert data["allocation_history"][0]["id_alokasi"] == "aloc-1"
    assert data["allocation_history"][0]["nominal_alokasi"] == 175000


def test_get_goal_detail_not_found_returns_404(monkeypatch, fake_supabase_client):
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/goals/nonexistent")

    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# DELETE /api/goals/{id} — blocked when allocation history exists
# ---------------------------------------------------------------------------

def test_delete_goal_with_existing_allocations_returns_400_and_does_not_delete(
    monkeypatch, fake_supabase_client
):
    far_deadline = (date.today() + timedelta(days=400)).isoformat()
    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 8000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "aloc-1",
                "id_pengguna": "user-1",
                "goal_id": "goal-1",
                "transaksi_id": "tx-1",
                "nominal_alokasi": 175000,
                "tanggal_alokasi": "2026-06-27T00:00:00+00:00",
            },
        ],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/goals/goal-1")

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "GOAL_HAS_ALLOCATIONS"

    remaining = fake_supabase_client.table("goal").select("*").execute().data
    assert len(remaining) == 1  # not deleted


def test_delete_goal_without_allocations_returns_204_and_deletes(
    monkeypatch, fake_supabase_client
):
    far_deadline = (date.today() + timedelta(days=400)).isoformat()
    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 8000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            },
        ],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/goals/goal-1")

    assert response.status_code == 204

    remaining = fake_supabase_client.table("goal").select("*").execute().data
    assert remaining == []
