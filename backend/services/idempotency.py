"""Shared idempotency-check helper (04-01-PLAN.md Task 1).

Used by transactions.py, goals.py, and allocations.py to detect a retried
offline-queue write (D-03, 04-CONTEXT.md) before performing any insert/update.
The Postgres partial UNIQUE index added in migration 008 is the actual atomic
duplicate-prevention mechanism — this SELECT-based check is only a fast-path
optimization so a retried sync gets back the original row instead of a DB
conflict error.
"""


def check_idempotency(
    supabase, table: str, current_user_id: str, idempotency_key: str | None
) -> dict | None:
    """Returns the existing row if `idempotency_key` was already processed for
    this user+table, else None.

    Callers MUST scope by id_pengguna (Security Domain V4, 04-RESEARCH.md) —
    never a bare idempotency_key lookup. A guessed/leaked UUID from another
    user's queue must never match here, so both `.eq()` filters are always
    applied together, mirroring the double-`.eq()` IDOR-safe pattern already
    used throughout transactions.py/allocations.py.
    """
    if not idempotency_key:
        return None

    rows = (
        supabase.table(table)
        .select("*")
        .eq("id_pengguna", current_user_id)
        .eq("idempotency_key", idempotency_key)
        .execute()
    ).data
    return rows[0] if rows else None
