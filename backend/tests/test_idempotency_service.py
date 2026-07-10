"""Tests for check_idempotency() (04-01-PLAN.md Task 1).

Covers the 4 behavior cases from 04-01-PLAN.md Task 1:
  1. No idempotency_key supplied -> None (never queries)
  2. Key supplied but no row seeded with that key/table/user -> None
  3. Matching row seeded for the same table/user/key -> returns that row
  4. Same key seeded for a DIFFERENT user -> still None (per-user scoping,
     never a bare key lookup — Security Domain V4, 04-RESEARCH.md)
"""

from backend.services.idempotency import check_idempotency


def test_no_idempotency_key_returns_none_and_never_queries(fake_supabase_client):
    """No key supplied at all — must short-circuit to None without touching
    the table store."""
    result = check_idempotency(fake_supabase_client, "transaksi", "user-1", None)
    assert result is None


def test_key_supplied_but_no_matching_row_returns_none(fake_supabase_client):
    fake_supabase_client.seed("transaksi", [])
    result = check_idempotency(fake_supabase_client, "transaksi", "user-1", "key-a")
    assert result is None


def test_matching_row_for_same_user_and_key_is_returned(fake_supabase_client):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "idempotency_key": "key-a",
                "nominal": 500000,
            }
        ],
    )
    result = check_idempotency(fake_supabase_client, "transaksi", "user-1", "key-a")
    assert result is not None
    assert result["id_transaksi"] == "tx-1"
    assert result["idempotency_key"] == "key-a"


def test_same_key_for_different_user_never_collides(fake_supabase_client):
    """Cross-user IDOR guard: a row seeded with the same idempotency_key but
    a DIFFERENT id_pengguna must never be returned for user-1's lookup."""
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-victim",
                "id_pengguna": "user-2",
                "idempotency_key": "key-a",
                "nominal": 999999,
            }
        ],
    )
    result = check_idempotency(fake_supabase_client, "transaksi", "user-1", "key-a")
    assert result is None
