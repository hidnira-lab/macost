# External Integrations

**Analysis Date:** 2026-06-30

## APIs & External Services

**Backend API (internal):**
- Macost REST API - Defined in `API_CONTRACT.md`; all endpoints prefixed `/api/`
  - Base URL dev: `http://localhost:8000`
  - Base URL prod: `https://macost-api.onrender.com`
  - Auth: Bearer token (Supabase JWT) in `Authorization` header for all routes except `/api/auth/*`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary data store for all entities (users, wallets, transactions, goals, allocations)
  - Connection: via Supabase REST API or direct PostgreSQL; env var not yet committed (expected `SUPABASE_URL`, `SUPABASE_KEY`)
  - Client: Supabase SDK (not yet installed in Python venv; integration planned per CLAUDE.md)
  - ORM: None detected yet; FastAPI + Pydantic models planned without SQLAlchemy

**File Storage:**
- Not applicable (no file uploads in `API_CONTRACT.md`)

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - JWT-based authentication
  - Registration: `POST /api/auth/register` — proxied through FastAPI to Supabase
  - Login: `POST /api/auth/login` — returns `access_token` (Supabase JWT)
  - Token format: Bearer JWT passed as `Authorization: Bearer <token>`
  - Account lockout: 423 response after repeated failures (NFR-05)
  - Server-side: FastAPI verifies JWT on each protected request

## Monitoring & Observability

**Error Tracking:**
- None configured

**Logs:**
- FastAPI default stdout logging (Uvicorn access logs)

## CI/CD & Deployment

**Hosting:**
- Backend: Render.com (`https://macost-api.onrender.com`)
- Frontend: Vercel (web, primary MVP target); Tauri 2.0 Desktop build (static Next.js export). Android APK and PWA fallback: post-MVP.

**CI Pipeline:**
- `.github/workflows/` directory referenced in CLAUDE.md; no workflow files found yet

## Environment Configuration

**Required env vars (from `API_CONTRACT.md` and CLAUDE.md):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` (anon or service role) - Supabase API key
- JWT secret (managed by Supabase; no manual config needed for verification)

**Secrets location:**
- Not committed; expected via host environment (Render.com env vars for production)

## Webhooks & Callbacks

**Incoming:**
- None defined in `API_CONTRACT.md`

**Outgoing:**
- None defined

## Smart Allocation Engine (Internal)

**SAW Algorithm:**
- Location: `backend/services/saw_engine.py` (planned; not yet created)
- Purpose: Goal ranking via Simple Additive Weighting
- Criteria weights (from survey n=62):
  - `personal_importance`: 22.5%
  - `progress_gap`: 21.9%
  - `saving_capacity`: 21.5%
  - `urgency`: 17.8%
  - `target_amount`: 16.2%
- Endpoint: `POST /api/allocation/suggest` (see `API_CONTRACT.md`)
- Behavior: Always returns suggestions for user confirmation; never auto-executes

---

*Integration audit: 2026-06-30*
