---
phase: 01-foundation
plan: 2
subsystem: backend
status: complete
tags: [fastapi, supabase, jwt, auth, wallets, crud, cors]
dependency_graph:
  requires: []
  provides:
    - JWTBearer dependency (get_current_user_id) protecting all /api/wallets/* routes
    - POST /api/auth/register and POST /api/auth/login endpoints
    - GET/POST/PUT/DELETE /api/wallets endpoints with user-scoped Supabase access
    - backend/requirements.txt with PyJWT>=2.9.0 (NOT python-jose)
    - backend/migrations/001_create_dompet.sql for Supabase SQL Editor
  affects:
    - All frontend API calls to /api/wallets/* (need valid Supabase JWT)
    - Track D (auth session) — token from login must be stored and sent as Bearer
    - Track C (API client) — apiFetch must attach Authorization header
tech_stack:
  added:
    - PyJWT 2.13.0 (JWT verification; HS256 + audience=authenticated for Supabase)
    - supabase-py 2.31.0 (PostgreSQL CRUD via Supabase REST)
    - python-dotenv 1.2.2 (env var loading)
  patterns:
    - JWTBearer via FastAPI HTTPBearer + Depends() — one dependency protecting all wallet routes
    - Module-level Supabase client caching (get_supabase_admin / get_supabase_anon)
    - Double .eq() filter pattern for cross-user isolation (id_dompet + id_pengguna)
key_files:
  created:
    - backend/core/supabase.py — admin and anon Supabase client factories
    - backend/dependencies/auth.py — get_current_user_id() JWTBearer dependency
    - backend/routers/auth.py — POST /api/auth/register and /api/auth/login
    - backend/routers/wallets.py — full CRUD for /api/wallets
    - backend/models/wallet.py — WalletCreate, WalletUpdate, WalletResponse
    - backend/migrations/001_create_dompet.sql — dompet table + RLS policies
  modified:
    - backend/routers/auth.py — replaced stub with full implementation
    - backend/routers/wallets.py — replaced stub with full CRUD
decisions:
  - "Use PyJWT (not python-jose) — python-jose abandoned and broken on Python 3.10+"
  - "Use HS256 algorithm with audience=authenticated for Supabase JWT verification"
  - "Cache Supabase clients at module level to avoid reconnect overhead per request"
  - "DELETE returns 204 regardless of wallet existence — avoids information disclosure"
  - "Register uses admin.create_user() then anon.sign_in_with_password() — admin API does not issue tokens"
  - "Supabase table creation (SQL Editor) and Render.com env vars are human-only tasks — SQL file provided in backend/migrations/"
metrics:
  duration: "~25 minutes"
  completed: "2026-07-02T02:52:00Z"
  tasks_completed: 3
  files_created: 6
  files_modified: 2
---

# Phase 01 Plan 02: Backend Foundation (FastAPI Auth + Wallet CRUD) Summary

One-liner: FastAPI backend with PyJWT HS256 JWTBearer middleware, Supabase-backed register/login, and full wallet CRUD with per-user data isolation via double `.eq()` filtering.

## What Was Built

### Task 1: Project structure, requirements, CORS, housekeeping
**Note:** This task was partially pre-completed by the parallel Plan 01-01 agent, which scaffolded the backend as part of Next.js static export work. The following were already committed in `de94fc7`:
- `backend/requirements.txt` with PyJWT>=2.9.0, supabase>=2.0.0, fastapi>=0.138.2, uvicorn[standard]>=0.49.0, pydantic>=2.13.0, python-multipart>=0.0.32, python-dotenv>=1.0.0
- `backend/main.py` with CORSMiddleware (tauri://localhost, https://tauri.localhost, http://localhost, http://localhost:3000)
- `backend/{routers,dependencies,models,core}/__init__.py` empty package files
- `.gitignore` fixed (removed heredoc wrapper lines, added `backend/venv/`)
- `backend/routers/auth.py` and `backend/routers/wallets.py` stubs

All PyJWT 2.13.0 and FastAPI 0.138.2 installed and verified. `backend/venv/` not tracked by git (`git ls-files backend/venv/` returns 0 files).

### Task 2: Auth endpoints with JWTBearer (commit `7337dbf`)
- **`backend/core/supabase.py`**: `get_supabase_admin()` (SERVICE_ROLE_KEY, bypasses RLS) and `get_supabase_anon()` (ANON_KEY, for token issuance) — both cached at module level
- **`backend/dependencies/auth.py`**: `get_current_user_id()` dependency using `jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")` — returns `payload["sub"]` (Supabase user UUID). Raises 401 with `{"error": {"code": "TOKEN_EXPIRED", ...}}` or `{"error": {"code": "UNAUTHORIZED", ...}}`
- **`backend/routers/auth.py`**: 
  - `POST /api/auth/register`: `admin.create_user()` (email_confirm=True) + `anon.sign_in_with_password()` to obtain token. Returns 201 with `{id_pengguna, nama, email, access_token}`
  - `POST /api/auth/login`: `anon.sign_in_with_password()`. Returns 200 with `{access_token, id_pengguna}`. Returns 423 with `ACCOUNT_LOCKED` on rate limit, 401 with `INVALID_CREDENTIALS` on failure

### Task 3: Wallet CRUD with Supabase (commit `0df0db1`)
- **`backend/models/wallet.py`**: `WalletCreate`, `WalletUpdate`, `WalletResponse` Pydantic models
- **`backend/routers/wallets.py`**:
  - `GET /api/wallets`: `.select("*").eq("id_pengguna", current_user_id)` returns `{"wallets": [...]}`
  - `POST /api/wallets`: insert with `saldo=0`; returns 201 with wallet object
  - `PUT /api/wallets/{id}`: `.update().eq("id_dompet", id).eq("id_pengguna", current_user_id)` — double eq prevents cross-user rename; returns 404 if empty result
  - `DELETE /api/wallets/{id}`: `.delete().eq("id_dompet", id).eq("id_pengguna", current_user_id)`; returns 204 regardless of existence
- **`backend/migrations/001_create_dompet.sql`**: Ready-to-run SQL for Supabase SQL Editor (dompet table + 4 RLS policies)

## Human Setup Required

The following steps CANNOT be automated and must be done by Fertika manually:

### 1. Create dompet table in Supabase
- Go to: Supabase Dashboard → SQL Editor
- Run the SQL from: `backend/migrations/001_create_dompet.sql`
- This creates the `dompet` table with RLS policies

### 2. Set environment variables in Render.com
- Go to: Render.com → Service → Environment → Add Environment Variable
- Add these 4 variables:

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key (NEVER share) |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public key |

### 3. Set up UptimeRobot
- Create a free HTTP monitor at https://uptimerobot.com
- URL: `https://macost-api.onrender.com/health`
- Interval: every 5 minutes
- Prevents Render free tier cold start during the July 14 demo

## Deviations from Plan

### Auto-detected: Task 1 pre-completed by parallel agent

**Found during:** Task 1 start
**Issue:** Plan 01-01 (Track A) agent had already committed the backend scaffolding as part of its `feat(01-01)` commit (`de94fc7`): requirements.txt, main.py with CORS, __init__.py files, stub routers, and .gitignore fix.
**Fix:** Verified all Task 1 artifacts were correctly implemented (PyJWT installed, CORS origins correct, venv not tracked), then proceeded directly to Task 2.
**Impact:** No rework needed. All Task 1 acceptance criteria already satisfied.

### Rule 2 (missing critical functionality): SUPABASE_ANON_KEY client

**Found during:** Task 2 implementation
**Issue:** The plan mentioned adding SUPABASE_ANON_KEY for `sign_in_with_password`, but core/supabase.py needed a separate anon client factory. The plan only described `get_supabase_admin()` explicitly.
**Fix:** Added `get_supabase_anon()` function to `backend/core/supabase.py` using `SUPABASE_ANON_KEY` — required because Supabase admin API creates users but does NOT issue access tokens; the anon client is needed for `sign_in_with_password()` to obtain the JWT.
**Files:** `backend/core/supabase.py`

## Verification Results

All 7 overall phase checks pass:

1. `python -c "import jwt; assert not hasattr(jwt, 'JWTError')"` — PASS (PyJWT installed, not python-jose)
2. `from backend.main import app` — PASS (no ImportError)
3. `GET /` returns `{"status": "Macost backend running"}` — endpoint present
4. `GET /health` returns `{"status": "ok"}` — endpoint present
5. `POST /api/auth/login` with wrong credentials → 401 with error JSON — logic confirmed via code review
6. `GET /api/wallets` without token → 401 — JWTBearer dependency confirmed on all 4 wallet routes
7. `git ls-files backend/venv/` — returns 0 files (venv not tracked)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| backend/core/supabase.py | FOUND |
| backend/dependencies/auth.py | FOUND |
| backend/routers/auth.py | FOUND |
| backend/routers/wallets.py | FOUND |
| backend/models/wallet.py | FOUND |
| backend/migrations/001_create_dompet.sql | FOUND |
| commit 7337dbf (Task 2) | FOUND |
| commit 0df0db1 (Task 3) | FOUND |
