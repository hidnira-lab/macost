from datetime import date

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    nominal: int = Field(gt=0)
    tanggal_transaksi: date
    metode_input: str = "Manual"
    dompet_id: str
    kategori_id: str
    catatan: str | None = None
    # Accepted-but-always-ignored for backward compatibility with any stale
    # caller still sending it per API_CONTRACT.md v0.1's original request
    # example. D-01 (02-CONTEXT.md) locks that the frontend never sends this
    # field and the backend always re-derives it server-side from the
    # looked-up kategori row (see backend/routers/transactions.py). The
    # handler must never read this field when building the insert payload.
    tipe_transaksi: str | None = None


class TransactionUpdate(BaseModel):
    nominal: int = Field(gt=0)
    tanggal_transaksi: date
    metode_input: str = "Manual"
    dompet_id: str
    kategori_id: str
    catatan: str | None = None
    tipe_transaksi: str | None = None


class TransactionResponse(BaseModel):
    id_transaksi: str
    tipe_transaksi: str
    nominal: int
    tanggal_transaksi: str
    metode_input: str
    dompet_id: str
    kategori_id: str
    source_label: str | None = None
    catatan: str | None = None
    created_at: str
