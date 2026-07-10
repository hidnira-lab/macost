"""Tests for POST/GET /api/transactions — server-derived labels + IDOR-safe list.

Uses an isolated TestClient (bare FastAPI() + transactions.router only), matching
the same pattern established in test_categories.py, so this suite is independent
of backend/main.py's central wiring (02-14-PLAN.md). Covers the 4 behavior cases
from 02-05-PLAN.md Task 2 (D-01/Pitfall 1 server-derivation + IDOR-safe GET).
"""

from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models.receipt import ReceiptExtraction
from backend.models.statement import StatementExtractionList, StatementTransaction
from backend.routers import transactions
from backend.services import statement_service

FREELANCE_KATEGORI = {
    "id_kategori": "kat-freelance",
    "nama_kategori": "Freelance / Kerja Sampingan",
    "tipe": "Pemasukan",
    "flag_pemasukan": "Flexible Side Income",
    "flag_pengeluaran": None,
}

MAKAN_KATEGORI = {
    "id_kategori": "kat-makan",
    "nama_kategori": "Makan & Minum",
    "tipe": "Pengeluaran",
    "flag_pemasukan": None,
    "flag_pengeluaran": "Kebutuhan",
}


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(transactions.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[transactions.get_current_user_id] = lambda: user_id
    return TestClient(app)


def test_post_transaction_derives_tipe_transaksi_and_source_label_from_kategori(
    monkeypatch, fake_supabase_client
):
    """No `tipe_transaksi` at all in the request body — the server must still
    derive tipe_transaksi='Pemasukan' and source_label='Flexible Side Income'
    purely from the looked-up kategori row (D-01 / Pattern 1)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 201
    data = response.json()
    assert data["tipe_transaksi"] == "Pemasukan"
    assert data["source_label"] == "Flexible Side Income"
    assert data["allocation_suggestion_available"] is True


def test_post_transaction_ignores_body_tipe_transaksi_even_if_present_and_mismatched(
    monkeypatch, fake_supabase_client
):
    """Body explicitly sends tipe_transaksi='Pengeluaran' but selects a
    Pemasukan category — the server must always ignore the body value and
    still derive 'Pemasukan' from kategori.tipe (Pitfall 1 / D-01). Must
    never 422 for a mismatched/omitted tipe_transaksi."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
        "tipe_transaksi": "Pengeluaran",
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 201
    assert response.json()["tipe_transaksi"] == "Pemasukan"


def test_post_transaction_nominal_not_positive_returns_422(
    monkeypatch, fake_supabase_client
):
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 0,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 422


def test_get_transactions_filtered_by_category_never_leaks_other_users_rows(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 20000,
                "tanggal_transaksi": "2026-06-20",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "source_label": None,
                "catatan": None,
                "created_at": "2026-06-20T10:00:00+00:00",
            },
            {
                "id_transaksi": "tx-2",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T10:00:00+00:00",
            },
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            },
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get(
        "/api/transactions", params={"category_id": "kat-freelance"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert len(data["transactions"]) == 1
    assert data["transactions"][0]["id_transaksi"] == "tx-2"
    # Never leaks user-2's row (tx-3), even though it also matches kat-freelance
    ids = {t["id_transaksi"] for t in data["transactions"]}
    assert "tx-3" not in ids


# ---------------------------------------------------------------------------
# POST /api/transactions — idempotency_key (04-01-PLAN.md Task 2)
# ---------------------------------------------------------------------------

def test_post_transaction_with_idempotency_key_creates_once(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
        "idempotency_key": "idem-key-1",
    }
    response = client.post("/api/transactions", json=body)

    assert response.status_code == 201
    assert response.json()["allocation_suggestion_available"] is True

    rows = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(rows) == 1
    assert rows[0]["idempotency_key"] == "idem-key-1"


def test_post_transaction_retried_idempotency_key_returns_original_no_duplicate(
    monkeypatch, fake_supabase_client
):
    """A retried POST with the SAME idempotency_key (same body otherwise)
    must return the ORIGINAL row's data and must NOT create a second row."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
        "idempotency_key": "idem-key-retry",
    }
    first_response = client.post("/api/transactions", json=body)
    assert first_response.status_code == 201
    first_id = first_response.json()["id_transaksi"]

    second_response = client.post("/api/transactions", json=body)
    assert second_response.status_code == 201
    assert second_response.json()["id_transaksi"] == first_id

    rows = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(rows) == 1


def test_post_transaction_idempotency_key_scoped_per_user_no_cross_user_collision(
    monkeypatch, fake_supabase_client
):
    """Two different users each POST with the identical idempotency_key
    value — both must succeed independently, 2 distinct rows must exist."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()

    body = {
        "nominal": 500000,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-freelance",
        "catatan": None,
        "idempotency_key": "shared-key",
    }

    user1_client = _client_as("user-1", app)
    user1_response = user1_client.post("/api/transactions", json=body)
    assert user1_response.status_code == 201

    user2_client = _client_as("user-2", app)
    user2_response = user2_client.post("/api/transactions", json=body)
    assert user2_response.status_code == 201

    assert (
        user1_response.json()["id_transaksi"] != user2_response.json()["id_transaksi"]
    )

    rows = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(rows) == 2


# ---------------------------------------------------------------------------
# PUT /api/transactions/{id} — re-derives labels, IDOR-safe (02-09-PLAN.md)
# ---------------------------------------------------------------------------

def test_put_transaction_rederives_labels_from_new_kategori_and_ignores_body_tipe_transaksi(
    monkeypatch, fake_supabase_client
):
    """Editing a transaction to point at a different (Pengeluaran) kategori
    must re-derive tipe_transaksi/source_label from that NEW kategori — even
    when the body explicitly (and incorrectly) sends tipe_transaksi='Pemasukan'
    (T-2-02 mitigation, same rule as POST)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI, MAKAN_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T10:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 20000,
        "tanggal_transaksi": "2026-06-28",
        "dompet_id": "dompet-1",
        "kategori_id": "kat-makan",
        "catatan": "Makan siang",
        "tipe_transaksi": "Pemasukan",  # mismatched — must be ignored
    }
    response = client.put("/api/transactions/tx-1", json=body)

    assert response.status_code == 200
    data = response.json()
    assert data["tipe_transaksi"] == "Pengeluaran"
    assert data["source_label"] is None
    assert data["kategori_id"] == "kat-makan"
    assert data["nominal"] == 20000


def test_put_transaction_owned_by_another_user_returns_404(
    monkeypatch, fake_supabase_client
):
    """Editing a transaction id that belongs to another user must return 404
    (never 403 — avoids confirming the row exists, matching wallets.py)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "nominal": 1,
        "tanggal_transaksi": "2026-06-27",
        "dompet_id": "dompet-2",
        "kategori_id": "kat-freelance",
        "catatan": None,
    }
    response = client.put("/api/transactions/tx-3", json=body)

    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


# ---------------------------------------------------------------------------
# DELETE /api/transactions/{id} — 204 regardless, IDOR-safe (02-09-PLAN.md)
# ---------------------------------------------------------------------------

def test_delete_transaction_owned_by_caller_returns_204_and_removes_row(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 20000,
                "tanggal_transaksi": "2026-06-20",
                "metode_input": "Manual",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "source_label": None,
                "catatan": None,
                "created_at": "2026-06-20T10:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/transactions/tx-1")

    assert response.status_code == 204
    remaining = fake_supabase_client.table("transaksi").select("*").execute().data
    assert remaining == []


def test_delete_transaction_owned_by_another_user_returns_204_but_does_not_delete(
    monkeypatch, fake_supabase_client
):
    """DELETE for another user's transaction is a no-op 204 (IDOR-safe,
    matches wallets.py's delete_wallet convention) — the row must NOT
    actually be removed."""
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-2",
                "tipe_transaksi": "Pemasukan",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-27",
                "metode_input": "Manual",
                "dompet_id": "dompet-2",
                "kategori_id": "kat-freelance",
                "source_label": "Flexible Side Income",
                "catatan": None,
                "created_at": "2026-06-27T11:00:00+00:00",
            }
        ],
    )
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.delete("/api/transactions/tx-3")

    assert response.status_code == 204
    remaining = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(remaining) == 1
    assert remaining[0]["id_transaksi"] == "tx-3"


# ---------------------------------------------------------------------------
# POST /api/transactions/scan-receipt — validated upload, timeout-wrapped
# extraction, structured fallback (03-05-PLAN.md Task 1)
# ---------------------------------------------------------------------------

JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def test_scan_receipt_valid_jpeg_with_successful_extraction_returns_200(
    monkeypatch,
):
    """A valid JPEG under 10MB, with a mocked extract_receipt returning a
    ReceiptExtraction, produces a 200 with the exact API_CONTRACT.md success
    shape."""
    mock_extract = AsyncMock(
        return_value=ReceiptExtraction(
            merchant="Indomaret",
            nominal=27500,
            tanggal_transaksi="2026-06-27",
            items=["Aqua 600ml", "Roti Tawar"],
            suggested_category_id="kat-makan",
        )
    )
    monkeypatch.setattr(transactions, "extract_receipt", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = JPEG_MAGIC + b"fake jpeg bytes"
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.jpg", content, "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "extracted": True,
        "merchant": "Indomaret",
        "nominal": 27500,
        "tanggal_transaksi": "2026-06-27",
        "items": ["Aqua 600ml", "Roti Tawar"],
        "suggested_category_id": "kat-makan",
    }
    mock_extract.assert_awaited_once()


def test_scan_receipt_valid_png_is_also_accepted(monkeypatch):
    """PNG magic bytes are accepted too, per D-01's 'JPG/PNG' scope."""
    mock_extract = AsyncMock(
        return_value=ReceiptExtraction(
            merchant="Alfamart",
            nominal=15000,
            tanggal_transaksi="2026-06-28",
            items=None,
            suggested_category_id=None,
        )
    )
    monkeypatch.setattr(transactions, "extract_receipt", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = PNG_MAGIC + b"fake png bytes"
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.png", content, "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["extracted"] is True
    mock_extract.assert_awaited_once()


def test_scan_receipt_oversized_file_returns_400_and_never_calls_extract_receipt(
    monkeypatch,
):
    """An upload over 10MB is rejected with 400 VALIDATION_ERROR BEFORE any
    Gemini call is attempted (T-3-10)."""
    mock_extract = AsyncMock()
    monkeypatch.setattr(transactions, "extract_receipt", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    oversized_content = JPEG_MAGIC + (b"0" * (10 * 1024 * 1024 + 1))
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.jpg", oversized_content, "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"
    mock_extract.assert_not_awaited()


def test_scan_receipt_wrong_magic_number_returns_400_despite_spoofed_content_type(
    monkeypatch,
):
    """A renamed .txt file with Content-Type: image/jpeg is rejected — proves
    the endpoint doesn't trust the client-supplied content_type header alone
    (T-3-11)."""
    mock_extract = AsyncMock()
    monkeypatch.setattr(transactions, "extract_receipt", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    fake_content = b"this is just plain text, not an image"
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.txt", fake_content, "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"
    mock_extract.assert_not_awaited()


def test_scan_receipt_extraction_failure_returns_200_with_fallback_and_calls_once(
    monkeypatch,
):
    """When extract_receipt returns None (timeout/any Gemini-side failure),
    the endpoint returns 200 with extracted:false + error_message — never a
    500, never a retry (extract_receipt called exactly once)."""
    mock_extract = AsyncMock(return_value=None)
    monkeypatch.setattr(transactions, "extract_receipt", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = JPEG_MAGIC + b"fake jpeg bytes"
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.jpg", content, "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "extracted": False,
        "error_message": "Foto kurang jelas, silakan input manual atau coba lagi",
    }
    assert mock_extract.await_count == 1


def test_scan_receipt_without_token_returns_401():
    """No override of get_current_user_id — the real JWKS-based dependency
    runs, sees a missing bearer token, and returns 401 (same convention as
    every other endpoint in this router)."""
    app = _build_app()
    client = TestClient(app)

    content = JPEG_MAGIC + b"fake jpeg bytes"
    response = client.post(
        "/api/transactions/scan-receipt",
        files={"image": ("receipt.jpg", content, "image/jpeg")},
    )

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/transactions/upload-statement — validated PDF upload,
# timeout-wrapped extraction, duplicate flagging, structured fallback
# (03-06-PLAN.md Task 1)
# ---------------------------------------------------------------------------

PDF_MAGIC = b"%PDF"


def test_upload_statement_valid_pdf_with_mocked_extraction_returns_200_with_duplicate_flags(
    monkeypatch, fake_supabase_client
):
    """A valid PDF, with a mocked extract_statement returning a
    StatementExtractionList, produces 200 with extracted_transactions where
    is_possible_duplicate is computed by the real flag_duplicates()."""
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-existing",
                "id_pengguna": "user-1",
                "tanggal_transaksi": "2026-06-27",
                "nominal": 750000,
            }
        ],
    )
    monkeypatch.setattr(
        statement_service, "get_supabase_admin", lambda: fake_supabase_client
    )

    mock_extract = AsyncMock(
        return_value=StatementExtractionList(
            transactions=[
                StatementTransaction(
                    temp_id="t-1",
                    tanggal_transaksi="2026-06-27",
                    deskripsi="TRANSFER MASUK - PT KLIEN ABC",
                    nominal=750000,
                    tipe_transaksi="Pemasukan",
                    suggested_category_id="kat-freelance",
                ),
                StatementTransaction(
                    temp_id="t-2",
                    tanggal_transaksi="2026-06-28",
                    deskripsi="BELANJA INDOMARET",
                    nominal=27500,
                    tipe_transaksi="Pengeluaran",
                    suggested_category_id="kat-makan",
                ),
            ]
        )
    )
    monkeypatch.setattr(transactions, "extract_statement", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = PDF_MAGIC + b"-1.4 fake pdf bytes"
    response = client.post(
        "/api/transactions/upload-statement",
        files={"file": ("statement.pdf", content, "application/pdf")},
    )

    assert response.status_code == 200
    rows = response.json()["extracted_transactions"]
    assert len(rows) == 2
    assert rows[0]["temp_id"] == "t-1"
    assert rows[0]["is_possible_duplicate"] is True
    assert rows[1]["temp_id"] == "t-2"
    assert rows[1]["is_possible_duplicate"] is False
    mock_extract.assert_awaited_once()


def test_upload_statement_non_pdf_magic_number_returns_400(monkeypatch):
    """A file whose first bytes are not %PDF is rejected with 400 BEFORE any
    Gemini call is attempted."""
    mock_extract = AsyncMock()
    monkeypatch.setattr(transactions, "extract_statement", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = b"this is not a pdf file at all"
    response = client.post(
        "/api/transactions/upload-statement",
        files={"file": ("statement.pdf", content, "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"
    mock_extract.assert_not_awaited()


def test_upload_statement_oversized_file_returns_400_and_never_calls_extract_statement(
    monkeypatch,
):
    """An upload exceeding 50MB is rejected with 400 BEFORE any Gemini call
    (T-3-15)."""
    mock_extract = AsyncMock()
    monkeypatch.setattr(transactions, "extract_statement", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    oversized_content = PDF_MAGIC + (b"0" * (50 * 1024 * 1024 + 1))
    response = client.post(
        "/api/transactions/upload-statement",
        files={"file": ("statement.pdf", oversized_content, "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"
    mock_extract.assert_not_awaited()


def test_upload_statement_extraction_failure_returns_200_with_fallback(monkeypatch):
    """When extract_statement returns None (timeout/any Gemini-side
    failure), the endpoint returns 200 with a documented fallback shape —
    never a 500, never a retry."""
    mock_extract = AsyncMock(return_value=None)
    monkeypatch.setattr(transactions, "extract_statement", mock_extract)

    app = _build_app()
    client = _client_as("user-1", app)

    content = PDF_MAGIC + b"-1.4 fake pdf bytes"
    response = client.post(
        "/api/transactions/upload-statement",
        files={"file": ("statement.pdf", content, "application/pdf")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "extracted": False,
        "error_message": (
            "Gagal membaca file PDF. Pastikan filenya e-statement yang valid, "
            "lalu coba lagi."
        ),
    }
    assert mock_extract.await_count == 1


# ---------------------------------------------------------------------------
# POST /api/transactions/import-batch — batch create with imported/skipped
# counts (03-06-PLAN.md Task 2)
# ---------------------------------------------------------------------------

def test_import_batch_all_valid_rows_returns_correct_imported_count(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI, MAKAN_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "transactions": [
            {
                "temp_id": "t-1",
                "nominal": 750000,
                "tanggal_transaksi": "2026-06-27",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "catatan": None,
            },
            {
                "temp_id": "t-2",
                "nominal": 27500,
                "tanggal_transaksi": "2026-06-28",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "catatan": None,
            },
            {
                "temp_id": "t-3",
                "nominal": 15000,
                "tanggal_transaksi": "2026-06-29",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-makan",
                "catatan": None,
            },
        ]
    }
    response = client.post("/api/transactions/import-batch", json=body)

    assert response.status_code == 201
    assert response.json() == {"imported_count": 3, "skipped_count": 0}

    inserted = fake_supabase_client.table("transaksi").select("*").execute().data
    assert len(inserted) == 3


def test_import_batch_skips_invalid_kategori_without_aborting_whole_batch(
    monkeypatch, fake_supabase_client
):
    """A row with a not-found kategori_id is SKIPPED — not a 500, not an
    aborted batch — while other valid rows still import."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "transactions": [
            {
                "temp_id": "t-1",
                "nominal": 750000,
                "tanggal_transaksi": "2026-06-27",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "catatan": None,
            },
            {
                "temp_id": "t-2",
                "nominal": 27500,
                "tanggal_transaksi": "2026-06-28",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-tidak-ada",
                "catatan": None,
            },
        ]
    }
    response = client.post("/api/transactions/import-batch", json=body)

    assert response.status_code == 201
    assert response.json() == {"imported_count": 1, "skipped_count": 1}


def test_import_batch_ignores_body_tipe_transaksi_and_derives_from_kategori(
    monkeypatch, fake_supabase_client
):
    """tipe_transaksi/source_label are always server-derived from kategori,
    exactly like create_transaction — the batch endpoint never trusts a
    client-supplied tipe_transaksi (T-3-16)."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    client = _client_as("user-1", app)

    body = {
        "transactions": [
            {
                "temp_id": "t-1",
                "nominal": 750000,
                "tanggal_transaksi": "2026-06-27",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "catatan": None,
                "tipe_transaksi": "Pengeluaran",  # mismatched — must be ignored
            },
        ]
    }
    response = client.post("/api/transactions/import-batch", json=body)

    assert response.status_code == 201
    inserted = fake_supabase_client.table("transaksi").select("*").execute().data
    assert inserted[0]["tipe_transaksi"] == "Pemasukan"
    assert inserted[0]["source_label"] == "Flexible Side Income"


def test_import_batch_requires_auth_and_scopes_inserted_rows_to_current_user(
    monkeypatch, fake_supabase_client
):
    """No token -> 401 (same convention as every other endpoint). An
    authenticated batch's inserted rows are scoped to current_user_id."""
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(
        transactions, "get_supabase_admin", lambda: fake_supabase_client
    )

    app = _build_app()
    body = {
        "transactions": [
            {
                "temp_id": "t-1",
                "nominal": 750000,
                "tanggal_transaksi": "2026-06-27",
                "dompet_id": "dompet-1",
                "kategori_id": "kat-freelance",
                "catatan": None,
            },
        ]
    }

    unauth_response = TestClient(app).post(
        "/api/transactions/import-batch", json=body
    )
    assert unauth_response.status_code == 401

    client = _client_as("user-1", app)
    response = client.post("/api/transactions/import-batch", json=body)

    assert response.status_code == 201
    inserted = fake_supabase_client.table("transaksi").select("*").execute().data
    assert inserted[0]["id_pengguna"] == "user-1"
