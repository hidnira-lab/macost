"""Tests for POST/GET /api/transactions — server-derived labels + IDOR-safe list.

Uses an isolated TestClient (bare FastAPI() + transactions.router only), matching
the same pattern established in test_categories.py, so this suite is independent
of backend/main.py's central wiring (02-14-PLAN.md). Covers the 4 behavior cases
from 02-05-PLAN.md Task 2 (D-01/Pitfall 1 server-derivation + IDOR-safe GET).
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import transactions

FREELANCE_KATEGORI = {
    "id_kategori": "kat-freelance",
    "nama_kategori": "Freelance / Kerja Sampingan",
    "tipe": "Pemasukan",
    "flag_pemasukan": "Flexible Side Income",
    "flag_pengeluaran": None,
}

MAKAN_KATEGORI = {
    "id_kategori": "kat-makan",
    "nama_kategori": "Makan & Minum",
    "tipe": "Pengeluaran",
    "flag_pemasukan": None,
    "flag_pengeluaran": "Kebutuhan",
}


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(transactions.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[transactions.get_current_user_id] = lambda: user_id
    return TestClient(app)


def test_post_transaction_derives_tipe_transaksi_and_source_label_from_kategori(
    monkeypatch, fake_supabase_client
):
    """No `tipe_transaksi` at all in the request body — the server must still
    derive tipe_transaksi='Pemasukan' and source_label='Flexible Side Income'
    purely from the looked-up kategori row (D-01 / Pattern 1)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 201
    data = response.json()
    assert data["tipe_transaksi"] == "Pemasukan"
    assert data["source_label"] == "Flexible Side Income"
    assert data["allocation_suggestion_available"] is True


def test_post_transaction_ignores_body_tipe_transaksi_even_if_present_and_mismatched(
    monkeypatch, fake_supabase_client
):
    """Body explicitly sends tipe_transaksi='Pengeluaran' but selects a
    Pemasukan category — the server must always ignore the body value and
    still derive 'Pemasukan' from kategori.tipe (Pitfall 1 / D-01). Must
    never 422 for a mismatched/omitted tipe_transaksi."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
        "tipe_transaksi": "Pengeluaran",
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 201
    assert response.json()["tipe_transaksi"] == "Pemasukan"


def test_post_transaction_nominal_not_positive_returns_422(
    monkeypatch, fake_supabase_client
):
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 0,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 422


def test_get_transactions_filtered_by_category_never_leaks_other_users_rows(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 20000,
                "tanggal_transaksi": "2026-06-20",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "source_label": None,
                "catatan": None,
                "created_at": "2026-06-20T10:00:00+00:00",
            },
            {
                "id_transaksi": "tx-2",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T10:00:00+00:00",
            },
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            },
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get(
        "/api/transactions", params={"category_id": "kat-freelance"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert len(data["transactions"]) == 1
    assert data["transactions"][0]["id_transaksi"] == "tx-2"
    # Never leaks user-2's row (tx-3), even though it also matches kat-freelance
    ids = {t["id_transaksi"] for t in data["transactions"]}
    assert "tx-3" not in ids


# ---------------------------------------------------------------------------
# PUT /api/transactions/{id} — re-derives labels, IDOR-safe (02-09-PLAN.md)
# ---------------------------------------------------------------------------

def test_put_transaction_rederives_labels_from_new_kategori_and_ignores_body_tipe_transaksi(
    monkeypatch, fake_supabase_client
):
    """Editing a transaction to point at a different (Pengeluaran) kategori
    must re-derive tipe_transaksi/source_label from that NEW kategori — even
    when the body explicitly (and incorrectly) sends tipe_transaksi='Pemasukan'
    (T-2-02 mitigation, same rule as POST)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI, MAKAN_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T10:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 20000,
        "tanggal_transaksi": "2026-06-28",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-makan",
        "catatan": "Makan siang",
        "tipe_transaksi": "Pemasukan",  # mismatched — must be ignored
    }
    response = client.put("/api/transactions/tx-1", json=body)

    assert response.status_code == 200
    data = response.json()
    assert data["tipe_transaksi"] == "Pengeluaran"
    assert data["source_label"] is None
    assert data["kategori_id"] == "kat-makan"
    assert data["nominal"] == 20000


def test_put_transaction_owned_by_another_user_returns_404(
    monkeypatch, fake_supabase_client
):
    """Editing a transaction id that belongs to another user must return 404
    (never 403 — avoids confirming the row exists, matching wallets.py)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 1,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-2",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.put("/api/transactions/tx-3", json=body)

    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# DELETE /api/transactions/{id} — 204 regardless, IDOR-safe (02-09-PLAN.md)
# ---------------------------------------------------------------------------

def test_delete_transaction_owned_by_caller_returns_204_and_removes_row(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 20000,
                "tanggal_transaksi": "2026-06-20",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "source_label": None,
                "catatan": None,
                "created_at": "2026-06-20T10:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/transactions/tx-1")

    assert response.status_code == 204
    remaining = fake_supabase_client.table("transaksi").select("*").execute().data
    assert remaining == []


def test_delete_transaction_owned_by_another_user_returns_204_but_does_not_delete(
    monkeypatch, fake_supabase_client
):
    """DELETE for another user's transaction is a no-op 204 (IDOR-safe,
    matches wallets.py's delete_wallet convention) — the row must NOT
    actually be removed."""
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/transactions/tx-3")

    assert response.status_code == 204
    remaining = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(remaining) == 1
    assert remaining[0]["id_transaksi"] == "tx-3"
