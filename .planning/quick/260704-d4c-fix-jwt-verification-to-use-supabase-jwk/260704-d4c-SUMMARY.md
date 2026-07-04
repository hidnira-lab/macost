---
quick_id: 260704-d4c
status: complete
date: 2026-07-04
---

# Summary: Fix JWT verification to use Supabase JWKS instead of hardcoded HS256 secret

## What happened

While helping Hidayat provision the previously-missing Supabase project (quick task 260704-bud found register/login 500ing because the Supabase database had never been created), a second defect surfaced once Supabase was live: JWT verification in `backend/dependencies/auth.py` was hardcoded for legacy HS256 + a manually-copied shared secret. The live Supabase project uses the newer asymmetric "JWT Signing Keys" system (ES256 by default). Attempts to work around it by creating a manual HS256 signing key in the Supabase dashboard didn't help — HS256 keys under the new system are never exposed via the public JWKS endpoint (confirmed by fetching it directly), so there was no secret to copy at all.

## Fix

Rewrote `get_current_user_id` in `backend/dependencies/auth.py` to verify tokens against Supabase's JWKS endpoint using PyJWT's `PyJWKClient`, keyed by the token's `kid` header, instead of a hardcoded secret + algorithm. This works regardless of which asymmetric signing key Supabase currently has active (ES256/RS256/EdDSA), and removes the dependency on `SUPABASE_JWT_SECRET` entirely.

Hidayat also promoted a working ES256 signing key back to "In Use" in Supabase (after the failed HS256 detour).

## Verification

Re-ran the full auth + wallet flow against the live Railway deployment after merging to `main` (commit `ebadf7c`):

- `POST /api/auth/register` → 201
- `POST /api/auth/login` → 200
- `GET /api/wallets` (no token) → 401
- `GET /api/wallets` (invalid token) → 401 (previously 500)
- `GET /api/wallets` (real token) → 200
- `POST /api/wallets` → 201
- `PUT /api/wallets/{id}` → 200
- `DELETE /api/wallets/{id}` → 204

All Phase 1 UAT items now pass except item 8 (USE_MOCK toggle — requires a separate build, not a live-deployment concern) and the desktop-restart half of item 3 (needs one manual pass). Full detail in `.planning/phases/01-foundation/01-UAT.md`.

## Deploy note

This branch (`phase-1-foundation-and-environment`) was pushed directly to `main` per Hidayat's explicit request, since Railway/Vercel only auto-deploy from `main` (D-06). Fast-forward, no conflicts (`0a918d3..ebadf7c`).

## Files modified

- `backend/dependencies/auth.py`
- `.planning/phases/01-foundation/01-UAT.md`
- `.planning/STATE.md`
