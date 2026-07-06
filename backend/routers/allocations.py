from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.services import allocation_service

router = APIRouter()


def _transaction_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Transaksi tidak ditemukan"}},
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
