from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.wallet import WalletCreate, WalletUpdate, WalletResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/wallets — list user's wallets
# ---------------------------------------------------------------------------

@router.get("/wallets", response_model=dict)
def list_wallets(current_user_id: str = Depends(get_current_user_id)):
    """
    Returns all wallets belonging to the authenticated user. `saldo` is
    computed live as a derived SUM over that wallet's transaksi rows
    (Pemasukan minus Pengeluaran) — NOT read from the stale/legacy stored
    `dompet.saldo` column (02-RESEARCH.md Pitfall 9 / Assumption A7), using
    the same batched-aggregation pattern as goal progress (Pattern 2):
    exactly 2 Supabase queries total (dompet, then transaksi via `.in_()`),
    never one query per wallet.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("dompet")
        .select("*")
        .eq("id_pengguna", current_user_id)
        .execute()
    )
    dompet_rows = result.data
    dompet_ids = [row["id_dompet"] for row in dompet_rows]

    transaksi_rows = (
        supabase.table("transaksi")
        .select("dompet_id, tipe_transaksi, nominal")
        .in_("dompet_id", dompet_ids)
        .execute()
        .data
        if dompet_ids
        else []
    )

    saldo_by_dompet: dict[str, int] = {}
    for row in transaksi_rows:
        delta = row["nominal"] if row["tipe_transaksi"] == "Pemasukan" else -row["nominal"]
        saldo_by_dompet[row["dompet_id"]] = saldo_by_dompet.get(row["dompet_id"], 0) + delta

    wallets = [
        WalletResponse(
            id_dompet=str(row["id_dompet"]),
            nama_dompet=row["nama_dompet"],
            saldo=saldo_by_dompet.get(row["id_dompet"], 0),
        )
        for row in dompet_rows
    ]

    return {"wallets": [w.model_dump() for w in wallets]}


# ---------------------------------------------------------------------------
# POST /api/wallets — create a new wallet
# ---------------------------------------------------------------------------

@router.post("/wallets", status_code=status.HTTP_201_CREATED)
def create_wallet(
    body: WalletCreate,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Creates a wallet with saldo=0 for the authenticated user.
    Returns 201 with the created wallet object.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("dompet")
        .insert(
            {
                "id_pengguna": current_user_id,
                "nama_dompet": body.nama_dompet,
                "saldo": 0,
            }
        )
        .execute()
    )

    row = result.data[0]
    wallet = WalletResponse(
        id_dompet=str(row["id_dompet"]),
        nama_dompet=row["nama_dompet"],
        saldo=row["saldo"],
    )
    return wallet.model_dump()


# ---------------------------------------------------------------------------
# PUT /api/wallets/{wallet_id} — rename a wallet
# ---------------------------------------------------------------------------

@router.put("/wallets/{wallet_id}")
def update_wallet(
    wallet_id: str,
    body: WalletUpdate,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Renames a wallet. Double .eq() on both id_dompet and id_pengguna ensures
    users cannot rename another user's wallet even if they know the UUID.
    Returns 404 if wallet not found or not owned by the current user.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("dompet")
        .update({"nama_dompet": body.nama_dompet})
        .eq("id_dompet", wallet_id)
        .eq("id_pengguna", current_user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Dompet tidak ditemukan"}},
        )

    row = result.data[0]
    wallet = WalletResponse(
        id_dompet=str(row["id_dompet"]),
        nama_dompet=row["nama_dompet"],
        saldo=row["saldo"],
    )
    return wallet.model_dump()


# ---------------------------------------------------------------------------
# DELETE /api/wallets/{wallet_id} — delete a wallet
# ---------------------------------------------------------------------------

@router.delete("/wallets/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wallet(
    wallet_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Deletes a wallet. Double .eq() prevents cross-user deletion.
    Returns 204 regardless of whether the wallet existed (avoids information disclosure).
    """
    supabase = get_supabase_admin()
    supabase.table("dompet").delete().eq("id_dompet", wallet_id).eq(
        "id_pengguna", current_user_id
    ).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
