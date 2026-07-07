"""Tests for GET /api/categories — read-only, unscoped shared category list.

Uses an isolated TestClient (bare FastAPI() + categories.router only) so this
test suite has no dependency on backend/main.py's central wiring (that lands
in 02-14-PLAN.md). Per API_CONTRACT.md §3, kategori is a shared read-only
table — no per-user scoping (`.eq("id_pengguna", ...)`) should ever be applied
to this query.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import categories


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(categories.router, prefix="/api")
    return app


def test_get_categories_with_token_returns_200_and_seeded_rows(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed(
        "kategori",
        [
            {
                "id_kategori": "cat-1",
                "nama_kategori": "Makan & Minum",
                "tipe": "Pengeluaran",
                "flag_pemasukan": None,
                "flag_pengeluaran": "Kebutuhan",
            },
            {
                "id_kategori": "cat-2",
                "nama_kategori": "Freelance / Kerja Sampingan",
                "tipe": "Pemasukan",
                "flag_pemasukan": "Flexible Side Income",
                "flag_pengeluaran": None,
            },
        ],
    )

    monkeypatch.setattr(categories, "get_supabase_admin", lambda: fake_supabase_client)

    app = _build_app()
    app.dependency_overrides[categories.get_current_user_id] = lambda: "user-1"

    client = TestClient(app)
    response = client.get(
        "/api/categories", headers={"Authorization": "Bearer faketoken"}
    )

    assert response.status_code == 200
    body = response.json()
    assert "categories" in body
    assert len(body["categories"]) == 2

    ids = {c["id_kategori"] for c in body["categories"]}
    assert ids == {"cat-1", "cat-2"}

    freelance = next(
        c for c in body["categories"] if c["id_kategori"] == "cat-2"
    )
    assert freelance["nama_kategori"] == "Freelance / Kerja Sampingan"
    assert freelance["tipe"] == "Pemasukan"
    assert freelance["flag_pemasukan"] == "Flexible Side Income"
    assert freelance["flag_pengeluaran"] is None


def test_get_categories_without_authorization_header_returns_401():
    """No override of get_current_user_id — the real JWKS-based dependency
    runs, sees a missing bearer token, and returns 401 (per HTTPBearer's
    make_not_authenticated_error)."""
    app = _build_app()
    client = TestClient(app)

    response = client.get("/api/categories")

    assert response.status_code == 401
