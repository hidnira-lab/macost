import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from backend.services.gemini_service import extract_receipt, extract_statement
from backend.services.statement_service import flag_duplicates

router = APIRouter()

MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

MAX_STATEMENT_SIZE_BYTES = 50 * 1024 * 1024
PDF_MAGIC = b"%PDF"


def _derive_transaction_fields(kategori: dict) -> tuple[str, str | None]:
    """Server-derives tipe_transaksi/source_label from a kategori row — never
    from client-supplied tipe_transaksi (D-01/Pitfall 1, T-2-02, T-3-16).
    Shared by create_transaction, update_transaction, and import_batch so
    this derivation isn't duplicated a third time."""
    tipe_transaksi = kategori["tipe"]
    source_label = (
        kategori.get("flag_pemasukan") if tipe_transaksi == "Pemasukan" else None
    )
    return tipe_transaksi, source_label


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
    tipe_transaksi, source_label = _derive_transaction_fields(kategori)

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


# ---------------------------------------------------------------------------
# PUT /api/transactions/{id} — edit, re-derives labels, IDOR-safe (404)
# ---------------------------------------------------------------------------

@router.put("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Same server-derivation rule as create_transaction: tipe_transaksi/
    source_label are ALWAYS re-derived from the (possibly new) kategori_id —
    body.tipe_transaksi is never read (T-2-02). Double .eq() on both
    id_transaksi and id_pengguna makes this IDOR-safe (T-2-01) — a
    cross-user edit attempt returns 404 (never 403), matching wallets.py's
    convention.
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

    tipe_transaksi, source_label = _derive_transaction_fields(kategori)

    update_payload = {
        "tipe_transaksi": tipe_transaksi,
        "nominal": body.nominal,
        "tanggal_transaksi": body.tanggal_transaksi.isoformat(),
        "metode_input": body.metode_input,
        "dompet_id": body.dompet_id,
        "kategori_id": body.kategori_id,
        "source_label": source_label,
        "catatan": body.catatan,
    }

    result = (
        supabase.table("transaksi")
        .update(update_payload)
        .eq("id_transaksi", transaction_id)
        .eq("id_pengguna", current_user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Transaksi tidak ditemukan",
                }
            },
        )

    return _row_to_response(result.data[0])


# ---------------------------------------------------------------------------
# DELETE /api/transactions/{id} — 204 regardless of ownership (IDOR-safe)
# ---------------------------------------------------------------------------

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Double .eq() prevents cross-user deletion. Returns 204 regardless of
    whether the transaction existed/was owned by the caller — matches
    wallets.py's delete_wallet convention (avoids confirming row existence).
    """
    supabase = get_supabase_admin()
    supabase.table("transaksi").delete().eq("id_transaksi", transaction_id).eq(
        "id_pengguna", current_user_id
    ).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# POST /api/transactions/scan-receipt — validated upload, timeout-wrapped
# Gemini extraction, structured fallback (SCAN-01/02/03, 03-05-PLAN.md Task 1)
# ---------------------------------------------------------------------------

@router.post("/transactions/scan-receipt")
async def scan_receipt(
    image: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Validates size (<=10MB) and magic number (JPEG/PNG) BEFORE ever calling
    Gemini — never trusts the client-supplied content_type header alone
    (T-3-10, T-3-11). Does not create a transaction; only extracts and
    returns raw data for the frontend's review form to submit separately
    through POST /api/transactions (SCAN-02: never auto-save).
    """
    content = await image.read()

    if len(content) > MAX_RECEIPT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "File terlalu besar",
                }
            },
        )

    if not (content.startswith(JPEG_MAGIC) or content.startswith(PNG_MAGIC)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Format file tidak didukung",
                }
            },
        )

    result = await extract_receipt(content, image.content_type or "image/jpeg")

    if result is None:
        # Terminal fallback state (D-01/T-3-13): never a 500, never a retry.
        return {
            "extracted": False,
            "error_message": "Foto kurang jelas, silakan input manual atau coba lagi",
        }

    return {
        "extracted": True,
        "merchant": result.merchant,
        "nominal": result.nominal,
        "tanggal_transaksi": result.tanggal_transaksi,
        "items": result.items,
        "suggested_category_id": result.suggested_category_id,
    }


# ---------------------------------------------------------------------------
# POST /api/transactions/upload-statement — validated PDF upload,
# timeout-wrapped Gemini extraction, duplicate flagging, structured fallback
# (ESTAT-01/02/03, 03-06-PLAN.md Task 1)
# ---------------------------------------------------------------------------

@router.post("/transactions/upload-statement")
async def upload_statement(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Validates size (<=50MB) and magic number (%PDF) BEFORE ever calling
    Gemini (T-3-15) — never trusts the client-supplied content_type header
    alone. On success, flags duplicates via statement_service.flag_duplicates
    (id_pengguna-scoped, T-3-14). The fallback shape on Gemini failure is a
    documented, backward-compatible ADDITION to API_CONTRACT.md's
    upload-statement section, mirroring scan-receipt's extracted/error_message
    pattern for consistency.
    """
    content = await file.read()

    if len(content) > MAX_STATEMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "File terlalu besar",
                }
            },
        )

    if not content.startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Format file tidak didukung",
                }
            },
        )

    result = await extract_statement(content)

    if result is None:
        # Terminal fallback state (D-01/T-3-13 pattern reused): never a 500,
        # never a retry.
        return {
            "extracted": False,
            "error_message": (
                "Gagal membaca file PDF. Pastikan filenya e-statement yang "
                "valid, lalu coba lagi."
            ),
        }

    rows = [row.model_dump() for row in result.transactions]
    flagged_rows = flag_duplicates(current_user_id, rows)

    return {"extracted_transactions": flagged_rows}


# ---------------------------------------------------------------------------
# POST /api/transactions/import-batch — batch create with imported/skipped
# counts (ESTAT-03, 03-06-PLAN.md Task 2)
# ---------------------------------------------------------------------------

@router.post("/transactions/import-batch", status_code=status.HTTP_201_CREATED)
def import_batch(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Each row's kategori_id is looked up independently; a not-found kategori
    SKIPS that row (never raises, never aborts the rest of the batch).
    tipe_transaksi/source_label are re-derived from kategori exactly like
    create_transaction — a client-supplied tipe_transaksi is never trusted
    (T-3-16). temp_id is accepted but never persisted (client-side tracing
    only).
    """
    supabase = get_supabase_admin()
    incoming_transactions = body.get("transactions", [])

    imported_count = 0
    skipped_count = 0

    for item in incoming_transactions:
        kategori_rows = (
            supabase.table("kategori")
            .select("*")
            .eq("id_kategori", item["kategori_id"])
            .execute()
        ).data
        if not kategori_rows:
            skipped_count += 1
            continue

        kategori = kategori_rows[0]
        tipe_transaksi, source_label = _derive_transaction_fields(kategori)

        insert_payload = {
            "id_transaksi": str(uuid.uuid4()),
            "id_pengguna": current_user_id,
            "tipe_transaksi": tipe_transaksi,
            "nominal": item["nominal"],
            "tanggal_transaksi": item["tanggal_transaksi"],
            "metode_input": item.get("metode_input", "Manual"),
            "dompet_id": item["dompet_id"],
            "kategori_id": item["kategori_id"],
            "source_label": source_label,
            "catatan": item.get("catatan"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("transaksi").insert(insert_payload).execute()
        imported_count += 1

    return {"imported_count": imported_count, "skipped_count": skipped_count}
