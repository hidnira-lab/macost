"""Tests for GET /api/wallets — derived SUM saldo, batched aggregation.

Uses an isolated TestClient (bare FastAPI() + wallets.router only), matching
the pattern established in test_categories.py/test_transactions.py. Covers
the 3 behavior cases from 02-09-PLAN.md Task 2 (Pitfall 9 / A7): saldo is
computed live as SUM(Pemasukan) - SUM(Pengeluaran) over that wallet's
transaksi rows, never read from a stale stored column, and never issues a
per-wallet (N+1) query.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import wallets


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(wallets.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[wallets.get_current_user_id] = lambda: user_id
    return TestClient(app)


class _CountingSupabaseClient:
    """Wraps a FakeSupabaseClient and counts `.table(...)` invocations, so
    tests can assert the batched-aggregation query count (never N+1)."""

    def __init__(self, inner):
        self._inner = inner
        self.table_calls = 0

    def table(self, table_name: str):
        self.table_calls += 1
        return self._inner.table(table_name)


def test_get_wallets_saldo_is_derived_sum_of_pemasukan_minus_pengeluaran(
    monkeypatch, fake_supabase_client
):
    """1 wallet with saldo=0 stored column (stale/unused), 1 Pemasukan of
    500000 and 1 Pengeluaran of 100000 on that wallet -> saldo must be
    computed live as 400000, not read from the stored column."""
    fake_supabase_client.seed(
        "dompet",
        [
            {
                "id_dompet": "dompet-1",
                "id_pengguna": "user-1",
                "nama_dompet": "Gopay",
                "saldo": 0,  # stale stored column — must be ignored
            }
        ],
    )
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "dompet_id": "dompet-1",
            },
            {
                "id_transaksi": "tx-2",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "dompet_id": "dompet-1",
            },
        ],
    )
    monkeypatch.setattr(wallets, "get_supabase_admin", lambda: fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/wallets")

    assert response.status_code == 200
    data = response.json()
    assert len(data["wallets"]) == 1
    assert data["wallets"][0]["id_dompet"] == "dompet-1"
    assert data["wallets"][0]["saldo"] == 400000


def test_get_wallets_across_two_wallets_uses_exactly_two_batched_queries(
    monkeypatch, fake_supabase_client
):
    """2 wallets with transactions split across both — saldo must be correct
    per-wallet, and the handler must issue exactly 2 Supabase `.table(...)`
    calls total (dompet, then transaksi via `.in_()`), never one query per
    wallet (Pitfall 4/5 — no N+1)."""
    fake_supabase_client.seed(
        "dompet",
        [
            {
                "id_dompet": "dompet-1",
                "id_pengguna": "user-1",
                "nama_dompet": "Gopay",
                "saldo": 0,
            },
            {
                "id_dompet": "dompet-2",
                "id_pengguna": "user-1",
                "nama_dompet": "Cash",
                "saldo": 0,
            },
        ],
    )
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 300000,
                "dompet_id": "dompet-1",
            },
            {
                "id_transaksi": "tx-2",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 50000,
                "dompet_id": "dompet-2",
            },
        ],
    )
    counting_client = _CountingSupabaseClient(fake_supabase_client)
    monkeypatch.setattr(wallets, "get_supabase_admin", lambda: counting_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/wallets")

    assert response.status_code == 200
    data = response.json()
    by_id = {w["id_dompet"]: w["saldo"] for w in data["wallets"]}
    assert by_id["dompet-1"] == 300000
    assert by_id["dompet-2"] == -50000
    assert counting_client.table_calls == 2


def test_get_wallets_zero_transaction_wallet_returns_saldo_zero(
    monkeypatch, fake_supabase_client
):
    """A wallet with no transactions at all must return saldo=0, not an
    error and not the (irrelevant) stored column value."""
    fake_supabase_client.seed(
        "dompet",
        [
            {
                "id_dompet": "dompet-1",
                "id_pengguna": "user-1",
                "nama_dompet": "Gopay",
                "saldo": 0,
            }
        ],
    )
    # No transaksi rows seeded at all.
    monkeypatch.setattr(wallets, "get_supabase_admin", lambda: fake_supabase_client)

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get("/api/wallets")

    assert response.status_code == 200
    data = response.json()
    assert data["wallets"][0]["saldo"] == 0
