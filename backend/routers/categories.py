from fastapi import APIRouter, Depends

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.category import CategoryResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/categories — list the shared, read-only category taxonomy
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=dict)
def list_categories(current_user_id: str = Depends(get_current_user_id)):
    """
    Returns the full kategori taxonomy.

    Unlike every other Phase 2 table, `kategori` is a shared, unscoped,
    read-only table (per its RLS policy `kategori_select_all` — see
    002_create_kategori.sql) — no `.eq("id_pengguna", ...)` filter is applied
    here on purpose. Authentication is still required (Depends(get_current_user_id))
    so only logged-in users can read it, but the rows themselves are not
    per-user data.
    """
    supabase = get_supabase_admin()
    result = supabase.table("kategori").select("*").execute()

    categories = [
        CategoryResponse(
            id_kategori=str(row["id_kategori"]),
            nama_kategori=row["nama_kategori"],
            tipe=row["tipe"],
            flag_pemasukan=row.get("flag_pemasukan"),
            flag_pengeluaran=row.get("flag_pengeluaran"),
        )
        for row in result.data
    ]

    return {"categories": [c.model_dump() for c in categories]}
