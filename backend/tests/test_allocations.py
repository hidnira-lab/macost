"""Tests for POST /api/allocations, POST /api/allocations/{id}/skip, and
GET /api/allocations/pending (02-12-PLAN.md Task 2).

Covers the 3 behavior cases from 02-12-PLAN.md Task 2:
  1. POST /api/allocations with a valid body inserts exactly one `alokasi`
     row and returns 201 with goal_updated.nominal_terkumpul/progress_pct
     reflecting the new total
  2. POST /api/allocations/{transaction_id}/skip returns 200
     status="skipped" + pending_until == created_at + 24h, and writes
     NOTHING to the database
  3. GET /api/allocations/pending returns every Pemasukan+Flexible Side
     Income transaction with no matching alokasi row — covering both the
     never-touched case and the explicitly-skipped-but-not-confirmed case
     (both are identical from the DB's perspective since skip performs zero
     writes, 02-RESEARCH.md Open Question #1 Option b)
"""

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import allocations
from backend.services import goal_service, goal_settings_service


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(allocations.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[allocations.get_current_user_id] = lambda: user_id
    return TestClient(app)


def _patch_supabase(monkeypatch, fake_supabase_client):
    monkeypatch.setattr(allocations, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(goal_service, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: fake_supabase_client
    )


# ---------------------------------------------------------------------------
# POST /api/allocations — sole write path into `alokasi`
# ---------------------------------------------------------------------------


def test_post_allocations_inserts_one_row_and_returns_updated_goal_progress(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)

    far_deadline = (datetime.now(timezone.utc).date() + timedelta(days=400)).isoformat()
    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 1000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "alokasi-existing",
                "id_pengguna": "user-1",
                "goal_id": "goal-1",
                "transaksi_id": "trx-old",
                "nominal_alokasi": 200000,
                "tanggal_alokasi": "2026-06-15T00:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "trx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "created_at": "2026-06-27T10:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed("goal_settings", [])

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.post(
        "/api/allocations",
        json={
            "transaksi_id": "trx-1",
            "goal_id": "goal-1",
            "nominal_alokasi": 300000,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["nominal_alokasi"] == 300000
    assert data["goal_updated"]["id_goal"] == "goal-1"
    assert data["goal_updated"]["nominal_terkumpul"] == 500000
    assert data["goal_updated"]["progress_pct"] == 50

    alokasi_rows = fake_supabase_client._tables["alokasi"]
    assert len(alokasi_rows) == 2
    new_row = next(r for r in alokasi_rows if r["transaksi_id"] == "trx-1")
    assert new_row["id_pengguna"] == "user-1"
    assert new_row["goal_id"] == "goal-1"
    assert new_row["nominal_alokasi"] == 300000


def test_post_allocations_rejects_cross_user_transaction(
    monkeypatch, fake_supabase_client
):
    """IDOR guard (T-2-01) — a transaction belonging to another user must
    never be allocatable, even if the caller knows its id."""
    _patch_supabase(monkeypatch, fake_supabase_client)

    far_deadline = (datetime.now(timezone.utc).date() + timedelta(days=400)).isoformat()
    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 1000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed("alokasi", [])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "trx-victim",
                "id_pengguna": "victim-user",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 500000,
                "created_at": "2026-06-27T10:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed("goal_settings", [])

    app = _build_app()
    client = _client_as("attacker-user", app)

    response = client.post(
        "/api/allocations",
        json={
            "transaksi_id": "trx-victim",
            "goal_id": "goal-1",
            "nominal_alokasi": 300000,
        },
    )

    assert response.status_code == 404
    # Distinguishes our IDOR-guard's structured NOT_FOUND body from
    # FastAPI's generic "route doesn't exist" 404 (both return status 404,
    # but only a real implementation returns this exact structured shape) —
    # guards against this test passing vacuously before the route exists.
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"
    assert fake_supabase_client._tables["alokasi"] == []


# ---------------------------------------------------------------------------
# POST /api/allocations/{transaction_id}/skip — zero DB writes
# ---------------------------------------------------------------------------


def test_post_skip_returns_pending_until_and_writes_nothing(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)

    created_at = "2026-06-27T10:00:00+00:00"
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "trx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 500000,
                "created_at": created_at,
            }
        ],
    )
    fake_supabase_client.seed("alokasi", [])
    fake_supabase_client.seed("goal", [])
    fake_supabase_client.seed("goal_settings", [])

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.post("/api/allocations/trx-1/skip")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"

    expected_pending_until = (
        datetime.fromisoformat(created_at) + timedelta(hours=24)
    ).isoformat()
    assert data["pending_until"] == expected_pending_until

    # Zero DB writes: alokasi and transaksi tables are byte-for-byte
    # unchanged after the call (skip is read + compute only).
    assert fake_supabase_client._tables["alokasi"] == []
    assert fake_supabase_client._tables["transaksi"] == [
        {
            "id_transaksi": "trx-1",
            "id_pengguna": "user-1",
            "tipe_transaksi": "Pemasukan",
            "source_label": "Flexible Side Income",
            "nominal": 500000,
            "created_at": created_at,
        }
    ]


# ---------------------------------------------------------------------------
# GET /api/allocations/pending — implicit derivation, no new table
# ---------------------------------------------------------------------------


def test_get_pending_lists_unallocated_side_income_transactions_only(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)

    never_touched_created_at = "2026-06-27T10:00:00+00:00"
    explicitly_skipped_created_at = "2026-06-26T09:00:00+00:00"
    confirmed_created_at = "2026-06-25T08:00:00+00:00"

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "trx-never-touched",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 500000,
                "created_at": never_touched_created_at,
            },
            {
                # Explicitly skipped case: skip is a pure read+compute, so
                # this row is indistinguishable in storage from the
                # never-touched row above — both must appear in `pending`.
                "id_transaksi": "trx-explicitly-skipped",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 400000,
                "created_at": explicitly_skipped_created_at,
            },
            {
                "id_transaksi": "trx-confirmed",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 300000,
                "created_at": confirmed_created_at,
            },
            {
                "id_transaksi": "trx-expense",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "source_label": None,
                "nominal": 50000,
                "created_at": "2026-06-24T00:00:00+00:00",
            },
            {
                "id_transaksi": "trx-other-user",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "source_label": "Flexible Side Income",
                "nominal": 999999,
                "created_at": "2026-06-24T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "alokasi-1",
                "id_pengguna": "user-1",
                "goal_id": "goal-1",
                "transaksi_id": "trx-confirmed",
                "nominal_alokasi": 300000,
                "tanggal_alokasi": "2026-06-25T09:00:00+00:00",
            }
        ],
    )
    fake_supabase_client.seed("goal", [])
    fake_supabase_client.seed("goal_settings", [])

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/allocations/pending")

    assert response.status_code == 200
    pending = response.json()["pending"]
    pending_ids = {p["transaksi_id"] for p in pending}

    assert pending_ids == {"trx-never-touched", "trx-explicitly-skipped"}

    never_touched = next(p for p in pending if p["transaksi_id"] == "trx-never-touched")
    expected_expires_at = (
        datetime.fromisoformat(never_touched_created_at) + timedelta(hours=24)
    ).isoformat()
    assert never_touched["expires_at"] == expected_expires_at
    assert never_touched["nominal"] == 500000
