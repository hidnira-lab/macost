"""Tests for allocation_service.get_allocation_suggestion() and
GET /api/transactions/{id}/allocation-suggestion (02-12-PLAN.md Task 1).

Covers the 3 behavior cases from 02-12-PLAN.md Task 1:
  1. 3 ranked goals -> has_active_goal=True, top-ranked goal suggested,
     suggested_amount == round(nominal * 0.35), suggested_pct == 35,
     alternative_goals == rank-2 and rank-3 goals
  2. 0 goals -> {"has_active_goal": False} only, no exception
  3. GET on a transaction that is NOT Pemasukan+Flexible Side Income ->
     400 VALIDATION_ERROR (endpoint independently re-validates, Open
     Question #3 guard) instead of trusting the caller
"""

from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import allocations
from backend.services import allocation_service, goal_service, goal_settings_service

DEFAULT_WEIGHTS = {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162,
}


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(allocations.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[allocations.get_current_user_id] = lambda: user_id
    return TestClient(app)


def _patch_supabase(monkeypatch, fake_supabase_client):
    monkeypatch.setattr(allocations, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(
        allocation_service, "get_supabase_admin", lambda: fake_supabase_client
    )
    monkeypatch.setattr(goal_service, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: fake_supabase_client
    )


def _seed_three_goals(fake_supabase_client):
    far_deadline = (date.today() + timedelta(days=400)).isoformat()
    near_deadline = (date.today() + timedelta(days=20)).isoformat()
    mid_deadline = (date.today() + timedelta(days=100)).isoformat()

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
                "deadline": mid_deadline,
                "skor_keinginan": 3,
                "created_at": "2026-06-02T00:00:00+00:00",
            },
            {
                "id_goal": "goal-3",
                "id_pengguna": "user-1",
                "nama_goal": "Liburan",
                "nominal_target": 3000000,
                "deadline": far_deadline,
                "skor_keinginan": 2,
                "created_at": "2026-06-03T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed("alokasi", [])
    fake_supabase_client.seed("goal_settings", [])
    fake_supabase_client.seed("transaksi", [])


# ---------------------------------------------------------------------------
# get_allocation_suggestion() — 3 ranked goals
# ---------------------------------------------------------------------------


def test_get_allocation_suggestion_returns_top_ranked_goal_and_35pct_amount(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_three_goals(fake_supabase_client)

    transaction = {"nominal": 500000}
    result = allocation_service.get_allocation_suggestion(transaction, "user-1")

    assert result["has_active_goal"] is True
    assert result["suggested_amount"] == round(500000 * 0.35)
    assert result["suggested_pct"] == 35

    ranked_goals = goal_service.fetch_and_rank_goals("user-1")
    top_goal = ranked_goals[0]
    remaining_ids = {g["id_goal"] for g in ranked_goals[1:3]}

    assert result["suggested_goal_id"] == top_goal["id_goal"]
    assert len(result["alternative_goals"]) == 2
    assert {g["goal_id"] for g in result["alternative_goals"]} == remaining_ids


# ---------------------------------------------------------------------------
# get_allocation_suggestion() — 0 goals
# ---------------------------------------------------------------------------


def test_get_allocation_suggestion_zero_goals_returns_has_active_goal_false(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_supabase_client.seed("goal", [])
    fake_supabase_client.seed("alokasi", [])
    fake_supabase_client.seed("goal_settings", [])
    fake_supabase_client.seed("transaksi", [])

    transaction = {"nominal": 500000}
    result = allocation_service.get_allocation_suggestion(transaction, "user-1")

    assert result == {"has_active_goal": False}


# ---------------------------------------------------------------------------
# GET /api/transactions/{id}/allocation-suggestion — re-validation guard
# ---------------------------------------------------------------------------


def test_get_endpoint_rejects_non_side_income_transaction(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_three_goals(fake_supabase_client)

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "trx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "source_label": None,
                "nominal": 50000,
                "created_at": "2026-06-27T10:00:00+00:00",
            }
        ],
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/transactions/trx-1/allocation-suggestion")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
