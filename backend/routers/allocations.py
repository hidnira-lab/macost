import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.allocation import AllocationConfirmRequest
from backend.services import allocation_service, goal_service

router = APIRouter()


def _transaction_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Transaksi tidak ditemukan"}},
    )


def _goal_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Goal tidak ditemukan"}},
    )


def _not_side_income() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Transaksi ini bukan pemasukan side income",
            }
        },
    )


# ---------------------------------------------------------------------------
# GET /api/transactions/{id}/allocation-suggestion
# ---------------------------------------------------------------------------


@router.get("/transactions/{transaction_id}/allocation-suggestion")
def get_allocation_suggestion(
    transaction_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    IDOR-safe: double .eq() on both id_transaksi and id_pengguna (404 if not
    found/not owned, matching wallets.py's convention).

    Independently re-validates that the transaction is actually
    Pemasukan + Flexible Side Income before computing a suggestion — never
    trusts the caller just because `allocation_suggestion_available` was
    true at creation time (02-RESEARCH.md Open Question #3's recommended
    guard). A stale/buggy frontend calling this on an expense transaction
    gets a clear 400 VALIDATION_ERROR instead of a nonsensical suggestion.
    """
    supabase = get_supabase_admin()
    rows = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_transaksi", transaction_id)
        .eq("id_pengguna", current_user_id)
        .execute()
        .data
    )
    if not rows:
        raise _transaction_not_found()
    transaction = rows[0]

    if not (
        transaction.get("tipe_transaksi") == "Pemasukan"
        and transaction.get("source_label") == "Flexible Side Income"
    ):
        raise _not_side_income()

    return allocation_service.get_allocation_suggestion(transaction, current_user_id)


# ---------------------------------------------------------------------------
# POST /api/allocations — confirm allocation. THE ONLY write path into
# `alokasi` in the entire backend/ tree (T-2-05, critical) — this is the
# single money-moving mutation of the whole Smart Allocation flow, and it
# only ever fires from this explicit, user-confirmed endpoint. Never
# auto-executed (CLAUDE.md rule 4).
# ---------------------------------------------------------------------------


@router.post("/allocations", status_code=status.HTTP_201_CREATED)
def confirm_allocation(
    body: AllocationConfirmRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    IDOR-safe (T-2-01): both `transaksi_id` and `goal_id` are independently
    verified to belong to `current_user_id` before the insert — a user
    cannot allocate another user's transaction into their own goal, or vice
    versa. `nominal_alokasi > 0` is enforced by AllocationConfirmRequest's
    `Field(gt=0)` (T-2-04).
    """
    supabase = get_supabase_admin()

    transaksi_rows = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_transaksi", body.transaksi_id)
        .eq("id_pengguna", current_user_id)
        .execute()
        .data
    )
    if not transaksi_rows:
        raise _transaction_not_found()

    goal_rows = (
        supabase.table("goal")
        .select("*")
        .eq("id_goal", body.goal_id)
        .eq("id_pengguna", current_user_id)
        .execute()
        .data
    )
    if not goal_rows:
        raise _goal_not_found()

    new_id = str(uuid.uuid4())
    tanggal_alokasi = datetime.now(timezone.utc).isoformat()

    insert_payload = {
        "id_alokasi": new_id,
        "id_pengguna": current_user_id,
        "goal_id": body.goal_id,
        "transaksi_id": body.transaksi_id,
        "nominal_alokasi": body.nominal_alokasi,
        "tanggal_alokasi": tanggal_alokasi,
    }
    result = supabase.table("alokasi").insert(insert_payload).execute()
    row = result.data[0]

    # Re-fetch via the shared SAW-ranking entry point so the returned
    # goal_updated is always consistent with what GET /api/goals would show
    # (same batched-aggregation pattern as goals.py's create/update paths).
    goals = goal_service.fetch_and_rank_goals(current_user_id)
    updated_goal = next(g for g in goals if g["id_goal"] == body.goal_id)

    return {
        "id_alokasi": str(row["id_alokasi"]),
        "nominal_alokasi": row["nominal_alokasi"],
        "tanggal_alokasi": str(row["tanggal_alokasi"]),
        "goal_updated": {
            "id_goal": updated_goal["id_goal"],
            "nominal_terkumpul": updated_goal["nominal_terkumpul"],
            "progress_pct": updated_goal["progress_pct"],
        },
    }


# ---------------------------------------------------------------------------
# POST /api/allocations/{transaction_id}/skip — pure read + compute, ZERO
# database writes. The "pending" state is already implicitly true the
# moment a side-income transaction is created with no matching `alokasi`
# row — skip is a confirmation echo, not a new state transition
# (02-RESEARCH.md Open Question #1 Option b). This keeps schema scope to
# exactly the 6 migrations already pushed (no 7th table/column needed).
# ---------------------------------------------------------------------------


@router.post("/allocations/{transaction_id}/skip")
def skip_allocation(
    transaction_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase_admin()
    rows = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_transaksi", transaction_id)
        .eq("id_pengguna", current_user_id)
        .execute()
        .data
    )
    if not rows:
        raise _transaction_not_found()
    transaction = rows[0]

    created_at = datetime.fromisoformat(str(transaction["created_at"]))
    pending_until = created_at + timedelta(hours=24)

    return {"status": "skipped", "pending_until": pending_until.isoformat()}


# ---------------------------------------------------------------------------
# GET /api/allocations/pending — derives "pending" implicitly: any of the
# caller's Pemasukan/Flexible Side Income transactions with no matching
# `alokasi.transaksi_id` row, regardless of whether /skip was ever called
# for it (covers both the explicit-skip case AND the D-04 error-path case
# where the suggestion fetch silently failed and the user never saw the
# modal). Batched via `.in_()` (Pattern 2) — never N+1.
# ---------------------------------------------------------------------------


@router.get("/allocations/pending")
def list_pending_allocations(current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase_admin()

    transaksi_rows = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_pengguna", current_user_id)
        .eq("tipe_transaksi", "Pemasukan")
        .eq("source_label", "Flexible Side Income")
        .execute()
        .data
    )

    transaksi_ids = [r["id_transaksi"] for r in transaksi_rows]
    alokasi_rows = (
        supabase.table("alokasi")
        .select("transaksi_id")
        .in_("transaksi_id", transaksi_ids)
        .execute()
        .data
        if transaksi_ids
        else []
    )
    allocated_transaksi_ids = {r["transaksi_id"] for r in alokasi_rows}

    unallocated = [
        r for r in transaksi_rows if r["id_transaksi"] not in allocated_transaksi_ids
    ]

    # Suggested goal name is best-effort context for the pending list — if
    # the user has 0 active goals, has_active_goal is False and there is
    # simply nothing to suggest yet (never crashes, Rule 2 robustness).
    suggestion = allocation_service.get_allocation_suggestion(
        {"nominal": 0}, current_user_id
    )
    suggested_goal_name = (
        suggestion.get("suggested_goal_name") if suggestion.get("has_active_goal") else None
    )

    pending = []
    for r in unallocated:
        created_at = datetime.fromisoformat(str(r["created_at"]))
        expires_at = created_at + timedelta(hours=24)
        pending.append(
            {
                "transaksi_id": str(r["id_transaksi"]),
                "nominal": r["nominal"],
                "suggested_goal_name": suggested_goal_name,
                "expires_at": expires_at.isoformat(),
            }
        )

    return {"pending": pending}
