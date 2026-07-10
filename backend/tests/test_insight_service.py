"""Tests for insight_service.generate_user_insights() + GET /api/ai-insight —
AIINS-01/02/03 aggregation, IDOR-safety, and fallback (03-07-PLAN.md Task 1).
"""

import asyncio
import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models.insight import InsightItem
from backend.routers import ai_insight
from backend.services import goal_service, insight_service

INSIGHT_JSON = json.dumps(
    [
        {
            "id": "i1",
            "message": "Side income kamu bulan ini bisa nutup 60% goal Laptop.",
            "action_verb": "Alokasikan",
            "related_goal_id": "g1",
            "related_category_id": None,
            "generated_at": "2026-07-09T10:00:00Z",
        }
    ]
)


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ai_insight.router, prefix="/api")
    return app


def _patch_supabase(monkeypatch, fake_supabase_client):
    """generate_user_insights and fetch_and_rank_goals each hold their own
    module-level get_supabase_admin reference — both must point at the same
    fake client for a test to see a consistent seeded dataset."""
    monkeypatch.setattr(
        insight_service, "get_supabase_admin", lambda: fake_supabase_client
    )
    monkeypatch.setattr(
        goal_service, "get_supabase_admin", lambda: fake_supabase_client
    )


def test_generate_user_insights_returns_list_on_success(
    monkeypatch, fake_supabase_client, fake_gemini_response
):
    """On a successful mocked Gemini call, generate_user_insights returns the
    list[InsightItem] it received verbatim."""
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
            }
        ],
    )
    fake_gemini_response(text=INSIGHT_JSON)

    result = asyncio.run(insight_service.generate_user_insights("user-1"))

    assert isinstance(result, list)
    assert len(result) == 1
    assert isinstance(result[0], InsightItem)
    assert result[0].action_verb == "Alokasikan"


def test_generate_user_insights_returns_none_when_gemini_fails(
    monkeypatch, fake_supabase_client, fake_gemini_response
):
    """When gemini_service.generate_insight returns None (timeout/failure),
    generate_user_insights propagates None — it must NOT swallow the failure
    into an empty list."""
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_gemini_response(exception=asyncio.TimeoutError())

    result = asyncio.run(insight_service.generate_user_insights("user-1"))

    assert result is None


def test_get_ai_insight_success_returns_insight_available_true(
    monkeypatch, fake_supabase_client, fake_gemini_response
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_gemini_response(text=INSIGHT_JSON)

    app = _build_app()
    app.dependency_overrides[ai_insight.get_current_user_id] = lambda: "user-1"
    client = TestClient(app)

    response = client.get("/api/ai-insight")

    assert response.status_code == 200
    body = response.json()
    assert body["insight_available"] is True
    assert len(body["insights"]) == 1
    assert body["insights"][0]["action_verb"] == "Alokasikan"
    assert body["insights"][0]["related_goal_id"] == "g1"
    assert body["insights"][0]["related_category_id"] is None


def test_get_ai_insight_failure_returns_200_with_exact_fallback_message(
    monkeypatch, fake_supabase_client, fake_gemini_response
):
    """A Gemini failure/timeout must return 200 (never 500) with the exact
    locked fallback copy."""
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_gemini_response(exception=asyncio.TimeoutError())

    app = _build_app()
    app.dependency_overrides[ai_insight.get_current_user_id] = lambda: "user-1"
    client = TestClient(app)

    response = client.get("/api/ai-insight")

    assert response.status_code == 200
    assert response.json() == {
        "insight_available": False,
        "fallback_message": (
            "Insight belum bisa dibuat sekarang. Sementara itu, cek progres "
            "tabunganmu di halaman Goals."
        ),
    }


def test_generate_user_insights_never_includes_other_users_transactions(
    monkeypatch, fake_supabase_client, fake_gemini_response
):
    """IDOR-safety (T-3-18, critical): the assembled prompt sent to Gemini
    must never contain another user's transaction data, even though both
    users' rows exist in the same table."""
    _patch_supabase(monkeypatch, fake_supabase_client)
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-mine",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 20000,
                "tanggal_transaksi": "2026-06-20",
                "kategori_id": "kat-makan",
                "source_label": None,
            },
            {
                "id_transaksi": "tx-secret-other-user",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999999,
                "tanggal_transaksi": "2026-06-27",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
            },
        ],
    )
    fake_client = fake_gemini_response(text=INSIGHT_JSON)

    asyncio.run(insight_service.generate_user_insights("user-1"))

    sent_prompt = fake_client.models.calls[0]["contents"][0]
    assert "tx-mine" in sent_prompt
    assert "tx-secret-other-user" not in sent_prompt
    assert "999999999" not in sent_prompt
