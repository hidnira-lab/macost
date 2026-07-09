"""Shared Gemini 2.5 Flash integration layer for Phase 3's AI-backed
features (SCAN-01 receipt scan, ESTAT-01 e-statement import, AIINS-01/02
financial insight generation).

Every Gemini call goes through the SDK's async client
(`client.aio.models.generate_content`) wrapped in `asyncio.wait_for(...)`
— never the blocking sync client — per 03-RESEARCH.md Pitfall 2: a sync
call inside `async def` cannot be interrupted by `asyncio.wait_for` and
would silently defeat the 10s/15s hard-timeout requirements (SCAN-03,
AIINS-03).

Each function returns `None` (never raises) on ANY failure — timeout,
malformed response, API error, rate limit — per D-01/D-04's no-retry rule
("JANGAN retry otomatis" — CLAUDE.md). Callers construct their own generic
Bahasa Indonesia fallback message; the raw exception is never surfaced to
the client (T-3-02).
"""

import asyncio
import json

from google.genai import types

from backend.core.gemini_client import get_gemini_client
from backend.models.insight import InsightItem
from backend.models.receipt import ReceiptExtraction
from backend.models.statement import StatementExtractionList

RECEIPT_TIMEOUT_SECONDS = 10.0  # SCAN-03, locked
STATEMENT_TIMEOUT_SECONDS = 15.0  # not explicitly locked (RESEARCH.md Open Question #1); reuses AIINS-03's 15s for consistency
INSIGHT_TIMEOUT_SECONDS = 15.0  # AIINS-03, locked

RECEIPT_PROMPT = (
    "Ekstrak data struk ini: merchant, nominal total, tanggal transaksi "
    "(format ISO 8601 YYYY-MM-DD), daftar item. Balas dalam JSON sesuai schema."
)
STATEMENT_PROMPT = (
    "Ekstrak semua transaksi dari e-statement ini: tanggal transaksi "
    "(format ISO 8601 YYYY-MM-DD), deskripsi, nominal, tipe transaksi "
    "(Pemasukan/Pengeluaran). Balas dalam JSON sesuai schema."
)
INSIGHT_PROMPT_TEMPLATE = (
    "Berdasarkan data transaksi dan goal berikut, berikan insight keuangan "
    "singkat dalam Bahasa Indonesia yang natural. Setiap insight harus "
    "menyertakan action_verb (Alokasikan/Kurangi/Pertimbangkan) dan terkait "
    "ke satu goal atau kategori. Data: {data}. Balas dalam JSON sesuai schema."
)


async def extract_receipt(content: bytes, mime_type: str) -> ReceiptExtraction | None:
    """SCAN-01: extract merchant/nominal/tanggal/items from a receipt image."""
    try:
        response = await asyncio.wait_for(
            get_gemini_client().aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    RECEIPT_PROMPT,
                    types.Part.from_bytes(data=content, mime_type=mime_type),
                ],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ReceiptExtraction,
                },
            ),
            timeout=RECEIPT_TIMEOUT_SECONDS,
        )
    except Exception:
        return None  # no auto-retry (CLAUDE.md, D-01)
    return ReceiptExtraction.model_validate_json(response.text)


async def extract_statement(content: bytes) -> StatementExtractionList | None:
    """ESTAT-01: extract a list of transactions from a PDF e-statement."""
    try:
        response = await asyncio.wait_for(
            get_gemini_client().aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    STATEMENT_PROMPT,
                    types.Part.from_bytes(data=content, mime_type="application/pdf"),
                ],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": StatementExtractionList,
                },
            ),
            timeout=STATEMENT_TIMEOUT_SECONDS,
        )
    except Exception:
        return None  # no auto-retry (CLAUDE.md, D-01)
    return StatementExtractionList.model_validate_json(response.text)


async def generate_insight(prompt: str) -> list[InsightItem] | None:
    """AIINS-01/02: generate one-way financial insights from aggregated
    transaction/goal data. `prompt` is expected to already be assembled by
    the caller (e.g. via INSIGHT_PROMPT_TEMPLATE.format(data=...))."""
    try:
        response = await asyncio.wait_for(
            get_gemini_client().aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": list[InsightItem],
                },
            ),
            timeout=INSIGHT_TIMEOUT_SECONDS,
        )
    except Exception:
        return None  # no auto-retry (CLAUDE.md, D-01)
    return [InsightItem.model_validate(item) for item in json.loads(response.text)]
