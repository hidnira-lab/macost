"""Tests for statement_service.flag_duplicates() — ESTAT-02 duplicate
detection, scoped by id_pengguna (D-02, T-3-14 IDOR-safety).
"""

from backend.services import statement_service


def test_flag_duplicates_marks_matching_tanggal_nominal_pair_as_duplicate(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tanggal_transaksi": "2026-06-27",
                "nominal": 750000,
            }
        ],
    )
    monkeypatch.setattr(
        statement_service, "get_supabase_admin", lambda: fake_supabase_client
    )

    rows = [
        {
            "temp_id": "t-1",
            "tanggal_transaksi": "2026-06-27",
            "deskripsi": "TRANSFER MASUK",
            "nominal": 750000,
            "tipe_transaksi": "Pemasukan",
            "suggested_category_id": None,
            "is_possible_duplicate": False,
        },
        {
            "temp_id": "t-2",
            "tanggal_transaksi": "2026-06-28",
            "deskripsi": "BELANJA",
            "nominal": 50000,
            "tipe_transaksi": "Pengeluaran",
            "suggested_category_id": None,
            "is_possible_duplicate": False,
        },
    ]

    result = statement_service.flag_duplicates("user-1", rows)

    assert result[0]["is_possible_duplicate"] is True
    assert result[1]["is_possible_duplicate"] is False
    # Never mutates the input list in place
    assert rows[0]["is_possible_duplicate"] is False


def test_flag_duplicates_scoped_by_id_pengguna_ignores_other_users_matching_pairs(
    monkeypatch, fake_supabase_client
):
    """A matching (tanggal, nominal) pair belonging to a DIFFERENT user must
    NOT flag the row (T-3-14 IDOR-safety)."""
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-other-user",
                "id_pengguna": "user-2",
                "tanggal_transaksi": "2026-06-27",
                "nominal": 750000,
            }
        ],
    )
    monkeypatch.setattr(
        statement_service, "get_supabase_admin", lambda: fake_supabase_client
    )

    rows = [
        {
            "temp_id": "t-1",
            "tanggal_transaksi": "2026-06-27",
            "deskripsi": "TRANSFER MASUK",
            "nominal": 750000,
            "tipe_transaksi": "Pemasukan",
            "suggested_category_id": None,
            "is_possible_duplicate": False,
        }
    ]

    result = statement_service.flag_duplicates("user-1", rows)

    assert result[0]["is_possible_duplicate"] is False
