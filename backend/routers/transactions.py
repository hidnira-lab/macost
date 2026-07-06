import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.transaction import TransactionCreate, TransactionResponse

router = APIRouter()


def _row_to_response(row: dict) -> dict:
    return TransactionResponse(
        id_transaksi=str(row["id_transaksi"]),
        tipe_transaksi=row["tipe_transaksi"],
        nominal=row["nominal"],
        tanggal_transaksi=row["tanggal_transaksi"],
        metode_input=row["metode_input"],
        dompet_id=row["dompet_id"],
        kategori_id=row["kategori_id"],
        source_label=row.get("source_label"),
        catatan=row.get("catatan"),
        created_at=row["created_at"],
    ).model_dump()


# ---------------------------------------------------------------------------
# POST /api/transactions — create, server-derives tipe_transaksi/source_label
# ---------------------------------------------------------------------------

@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Looks up the selected kategori and ALWAYS derives tipe_transaksi/
    source_label from it (kategori.tipe / kategori.flag_pemasukan) — never
    from body.tipe_transaksi, even if a stale caller sends it (D-01 /
    Pitfall 1, 02-RESEARCH.md "Pattern 1: Server-derived fields").
    """
    supabase = get_supabase_admin()

    kategori_rows = (
        supabase.table("kategori")
        .select("*")
        .eq("id_kategori", body.kategori_id)
        .execute()
    ).data
    if not kategori_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Kategori tidak ditemukan",
                }
            },
        )
    kategori = kategori_rows[0]

    # tipe_transaksi/source_label are ALWAYS derived here — body.tipe_transaksi
    # is structurally never read when building the insert payload below.
    tipe_transaksi = kategori["tipe"]
    source_label = (
        kategori.get("flag_pemasukan") if tipe_transaksi == "Pemasukan" else None
    )

    # id_transaksi/created_at are generated here (rather than relying on the
    # DB's gen_random_uuid()/NOW() defaults) so the inserted row is always
    # immediately retrievable with a stable id/timestamp, in both the fake
    # in-memory test client (backend/tests/conftest.py) and the real
    # Supabase client (which accepts an explicit PK/timestamp on insert).
    new_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    insert_payload = {
        "id_transaksi": new_id,
        "id_pengguna": current_user_id,
        "tipe_transaksi": tipe_transaksi,
        "nominal": body.nominal,
        "tanggal_transaksi": body.tanggal_transaksi.isoformat(),
        "metode_input": body.metode_input,
        "dompet_id": body.dompet_id,
        "kategori_id": body.kategori_id,
        "source_label": source_label,
        "catatan": body.catatan,
        "created_at": created_at,
    }

    result = supabase.table("transaksi").insert(insert_payload).execute()
    row = result.data[0]

    allocation_suggestion_available = (
        tipe_transaksi == "Pemasukan" and source_label == "Flexible Side Income"
    )

    return {
        **_row_to_response(row),
        "allocation_suggestion_available": allocation_suggestion_available,
    }


# ---------------------------------------------------------------------------
# GET /api/transactions — filtered, paginated, scoped to current user
# ---------------------------------------------------------------------------

@router.get("/transactions", response_model=dict)
def list_transactions(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    category_id: str | None = Query(None),
    source: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Every query unconditionally scopes by id_pengguna (IDOR-safe, T-2-01) in
    addition to any caller-supplied optional filter.
    """
    supabase = get_supabase_admin()
    query = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_pengguna", current_user_id)
    )

    if category_id:
        query = query.eq("kategori_id", category_id)
    if source:
        query = query.eq("source_label", source)
    if start_date:
        query = query.gte("tanggal_transaksi", start_date.isoformat())
    if end_date:
        query = query.lte("tanggal_transaksi", end_date.isoformat())

    rows = query.execute().data
    total = len(rows)

    # Pagination applied in Python over the already user/filter-scoped rows —
    # avoids requiring Supabase's chainable .range() on top of every other
    # filter combination, consistent with this phase's Python-side
    # aggregation pattern (02-RESEARCH.md "Derived Fields" recommendation).
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_rows = rows[start_idx:end_idx]

    return {
        "transactions": [_row_to_response(row) for row in page_rows],
        "total": total,
        "page": page,
    }
