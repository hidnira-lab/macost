"""Integration smoke test for the fully-wired backend.main:app
(02-14-PLAN.md Task 2).

This is the ONLY test file in this phase that imports the REAL
`backend.main:app` rather than a bare isolated `FastAPI()` instance built
per-router (every other `test_*.py` in this suite intentionally tests each
router in isolation — see e.g. test_categories.py's docstring). Its purpose
is narrow and specific: prove that `backend/main.py`'s central wiring step
(registering categories/transactions/goals/goal_settings/allocations/
dashboard alongside the existing Phase 1 auth/wallets routers) actually
worked, and that every new router is still behind its auth dependency.

T-2-10 (critical, threat_model): a router registered in `main.py` without
its `Depends(get_current_user_id)` guard would silently expose data — the
`test_all_new_endpoints_require_auth` case below is the regression guard
for exactly that failure mode. A router missing the auth dependency would
return 200/422 instead of 401 and fail this test immediately.
"""

import pytest
from fastapi.testclient import TestClient

from backend.core import supabase as supabase_module
from backend.main import app

NEW_PHASE_2_GET_PATHS = [
    "/api/categories",
    "/api/transactions",
    "/api/goals",
    "/api/goal-settings",
    "/api/allocations/pending",
    "/api/dashboard",
]


@pytest.fixture
def client(monkeypatch, fake_supabase_client):
    # Per this plan's spec: monkeypatch the shared admin-client factory so
    # the real app never touches a live Supabase project during tests.
    monkeypatch.setattr(
        supabase_module, "get_supabase_admin", lambda: fake_supabase_client
    )
    return TestClient(app)


# ---------------------------------------------------------------------------
# T-2-10 regression guard — every new Phase 2 endpoint must still be
# auth-protected once registered in the real app
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("path", NEW_PHASE_2_GET_PATHS)
def test_all_new_endpoints_require_auth(client, path):
    """Unauthenticated GET to each of the 6 new Phase 2 paths must return
    401 — proves the router is both registered AND still behind the shared
    JWT dependency (no accidentally-unprotected endpoint)."""
    response = client.get(path)
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# All 6 new routers are actually reachable through the real app (present in
# the OpenAPI schema, not just registered-but-unreachable)
# ---------------------------------------------------------------------------

def test_all_new_endpoints_present_in_openapi_schema(client):
    schema_paths = app.openapi()["paths"]

    for expected_prefix in NEW_PHASE_2_GET_PATHS:
        assert any(
            path == expected_prefix or path.startswith(expected_prefix)
            for path in schema_paths
        ), f"{expected_prefix} missing from OpenAPI schema"


def test_existing_auth_and_wallets_routers_unaffected(client):
    """Sanity check that extending main.py's router registration didn't
    break the pre-existing Phase 1 auth/wallets wiring."""
    schema_paths = app.openapi()["paths"]
    assert any(p.startswith("/api/auth") for p in schema_paths)
    assert any(p.startswith("/api/wallets") for p in schema_paths)

    # Wallets is also auth-protected — unauthenticated GET must 401.
    response = client.get("/api/wallets")
    assert response.status_code == 401
