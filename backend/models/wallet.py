from pydantic import BaseModel


class WalletCreate(BaseModel):
    nama_dompet: str


class WalletUpdate(BaseModel):
    nama_dompet: str


class WalletResponse(BaseModel):
    id_dompet: str
    nama_dompet: str
    saldo: int
