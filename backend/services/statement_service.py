"""Duplicate-detection for e-statement import (ESTAT-02, D-02).

Scopes exclusively by id_pengguna — the wallet isn't chosen until the final
import step (03-RESEARCH.md Pitfall 5), so duplicate matching cannot be
wallet-scoped. A matching (tanggal_transaksi, nominal) pair belonging to a
different user must never flag a row (T-3-14 IDOR-safety).
"""

from backend.core.supabase import get_supabase_admin


def flag_duplicates(user_id: str, rows: list[dict]) -> list[dict]:
    """Returns a new list of row dicts with is_possible_duplicate set per-row
    based on whether (tanggal_transaksi, nominal) matches an existing
    transaksi row for this user. Never mutates the input list in place."""
    supabase = get_supabase_admin()
    existing = (
        supabase.table("transaksi")
        .select("tanggal_transaksi,nominal")
        .eq("id_pengguna", user_id)
        .execute()
    ).data
    existing_keys = {(row["tanggal_transaksi"], row["nominal"]) for row in existing}

    flagged_rows = []
    for row in rows:
        new_row = dict(row)
        new_row["is_possible_duplicate"] = (
            new_row["tanggal_transaksi"],
            new_row["nominal"],
        ) in existing_keys
        flagged_rows.append(new_row)
    return flagged_rows
