from pydantic import BaseModel, Field


class ReceiptExtraction(BaseModel):
    """Gemini structured-output schema for POST /api/transactions/scan-receipt
    (SCAN-01). Doubles as the `response_schema` passed to
    `generate_content` — Gemini's structured-output mode constrains its
    output to match this shape.

    `tanggal_transaksi` is kept as a plain ISO date string (not Python's
    `date` type like `transaction.py`'s `TransactionCreate`) because Gemini
    always returns a string, never a native date object.
    """

    merchant: str
    nominal: int = Field(gt=0)
    tanggal_transaksi: str
    items: list[str] | None = None
    suggested_category_id: str | None = None
