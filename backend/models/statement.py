from pydantic import BaseModel, Field


class StatementTransaction(BaseModel):
    """Gemini structured-output item schema for a single extracted row of
    POST /api/transactions/upload-statement (ESTAT-01).

    `is_possible_duplicate` always defaults `False` from Gemini's own
    output — Gemini itself never determines duplicates. 03-06's
    `statement_service.py` computes and overwrites this field after
    extraction (D-02 duplicate-detection query).
    """

    temp_id: str
    tanggal_transaksi: str
    deskripsi: str
    nominal: int = Field(gt=0)
    tipe_transaksi: str
    suggested_category_id: str | None = None
    is_possible_duplicate: bool = False


class StatementExtractionList(BaseModel):
    """Top-level wrapper passed as Gemini's `response_schema` for the
    statement endpoint — structured-output mode needs one top-level schema
    object, not a bare list."""

    transactions: list[StatementTransaction]
