from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id_kategori: str
    nama_kategori: str
    tipe: str
    flag_pemasukan: str | None = None
    flag_pengeluaran: str | None = None
