"""Tests for GET/PUT /api/goal-settings — get-or-create default + weight-sum
validation (02-10-PLAN.md Task 1).

Uses an isolated TestClient (bare FastAPI() + goal_settings.router only),
matching the pattern established in test_wallets.py/test_transactions.py.
Covers the 4 behavior cases from 02-10-PLAN.md Task 1:
  1. GET with no existing row auto-creates default (never 404)
  2. GET with existing row returns it unchanged (no re-create/overwrite)
  3. PUT with weights summing to 0.95 -> 400 VALIDATION_ERROR, row not updated
  4. PUT with weights summing to exactly 1.0 -> succeeds, persists verbatim
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import goal_settings
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
    app.include_router(goal_settings.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[goal_settings.get_current_user_id] = lambda: user_id
    return TestClient(app)


def _patch_supabase(monkeypatch, fake_supabase_client):
    monkeypatch.setattr(
        goal_settings, "get_supabase_admin", lambda: fake_supabase_client
    )
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: fake_supabase_client
    )


def test_get_goal_settings_auto_creates_default_for_new_user(
    monkeypatch, fake_supabase_client
):
    """No existing goal_settings row -> auto-creates strategy='quick_win' with
    the exact 5 default weights, and returns it. Never a 404."""
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/goal-settings")

    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "quick_win"
    assert data["weights"] == DEFAULT_WEIGHTS

    # Row was actually persisted, not just returned ephemeral
    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert len(rows) == 1
    assert rows[0]["id_pengguna"] == "user-1"


def test_get_goal_settings_existing_row_returned_unchanged(
    monkeypatch, fake_supabase_client
):
    """An existing row (non-default strategy/weights) must be returned as-is,
    never re-created/overwritten with defaults."""
    custom_weights = {
        "personal_importance": 0.3,
        "progress_gap": 0.2,
        "saving_capacity": 0.2,
        "urgency": 0.15,
        "target_amount": 0.15,
    }
    fake_supabase_client.seed(
        "goal_settings",
        [
            {
                "id_pengguna": "user-1",
                "strategy": "importance_first",
                "weights": custom_weights,
            }
        ],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/goal-settings")

    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "importance_first"
    assert data["weights"] == custom_weights

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert len(rows) == 1  # not duplicated


def test_put_goal_settings_weight_sum_0_95_returns_400_validation_error(
    monkeypatch, fake_supabase_client
):
    """Weights summing to 0.95 (outside the 0.001 tolerance) must return a
    structured 400 VALIDATION_ERROR, not a bare FastAPI 422. Row not updated."""
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "strategy": "quick_win",
        "weights": {
            "personal_importance": 0.2,
            "progress_gap": 0.2,
            "saving_capacity": 0.2,
            "urgency": 0.2,
            "target_amount": 0.15,  # sums to 0.95
        },
    }
    response = client.put("/api/goal-settings", json=body)

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert rows[0]["weights"] == DEFAULT_WEIGHTS  # unchanged


def test_put_goal_settings_weight_sum_within_tolerance_succeeds_and_persists_verbatim(
    monkeypatch, fake_supabase_client
):
    """Weights summing to exactly 1.0 (floating-point default weights) must
    succeed and persist both strategy and weights EXACTLY as sent — the
    endpoint never applies TC-01 strategy multipliers itself (D-05)."""
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    body = {"strategy": "importance_first", "weights": DEFAULT_WEIGHTS}
    response = client.put("/api/goal-settings", json=body)

    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "importance_first"
    assert data["weights"] == DEFAULT_WEIGHTS  # stored verbatim, never re-weighted

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert rows[0]["strategy"] == "importance_first"
    assert rows[0]["weights"] == DEFAULT_WEIGHTS


def test_put_goal_settings_missing_required_key_returns_400_validation_error(
    monkeypatch, fake_supabase_client
):
    """A weights dict missing one of the 5 real keys (here: target_amount)
    must return a structured 400 VALIDATION_ERROR, not silently pass just
    because the remaining 4 values happen to sum to ~1.0. Row not updated."""
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "strategy": "quick_win",
        "weights": {
            "personal_importance": 0.3,
            "progress_gap": 0.25,
            "saving_capacity": 0.25,
            "urgency": 0.2,
            # target_amount missing
        },
    }
    response = client.put("/api/goal-settings", json=body)

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert rows[0]["weights"] == DEFAULT_WEIGHTS  # unchanged


def test_put_goal_settings_typo_key_returns_400_validation_error(
    monkeypatch, fake_supabase_client
):
    """The exact regression scenario from the bug report: a typo'd key
    (`progress_gp` instead of `progress_gap`) that still sums to ~1.0 across
    5 keys used to pass validation silently and corrupt stored weights --
    later blowing up saw_engine.rank_goals with a KeyError on every
    subsequent GET /api/goals. Must now return 400 VALIDATION_ERROR."""
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "strategy": "quick_win",
        "weights": {
            "personal_importance": 0.225,
            "progress_gp": 0.219,  # typo: should be progress_gap
            "saving_capacity": 0.215,
            "urgency": 0.178,
            "target_amount": 0.163,
        },
    }
    response = client.put("/api/goal-settings", json=body)

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert rows[0]["weights"] == DEFAULT_WEIGHTS  # unchanged


def test_put_goal_settings_extra_key_returns_400_validation_error(
    monkeypatch, fake_supabase_client
):
    """A weights dict with all 5 real keys plus a genuinely extra key must
    also be rejected -- `extra="forbid"` on GoalSettingsWeights covers both
    the missing-key and extra-key shape-mismatch cases. Row not updated."""
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": "user-1", "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )
    _patch_supabase(monkeypatch, fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "strategy": "quick_win",
        "weights": {
            **DEFAULT_WEIGHTS,
            "extra_criterion": 0.0,
        },
    }
    response = client.put("/api/goal-settings", json=body)

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"

    rows = fake_supabase_client.table("goal_settings").select("*").execute().data
    assert rows[0]["weights"] == DEFAULT_WEIGHTS  # unchanged
