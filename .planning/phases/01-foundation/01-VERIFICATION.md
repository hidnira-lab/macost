---
phase: 01-foundation
verified: 2026-07-04T10:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 1
overrides_applied: 1
overrides:
  - must_have: "backend/dependencies/auth.py with JWTBearer class validating HS256 algorithm and audience=authenticated"
    reason: "Original plan (01-02) specified hardcoded HS256 + shared-secret verification. Live UAT re-run on 2026-07-04 discovered the live Supabase project uses asymmetric JWT Signing Keys (ES256), which never expose a copyable HS256 secret — the planned approach was structurally incompatible with the actual production Supabase project. Fixed by rewriting get_current_user_id to verify via Supabase's JWKS endpoint (PyJWKClient, multi-algorithm: ES256/RS256/HS256/EdDSA), which is a strictly more correct and more robust implementation of the same AUTH-04 requirement (audience=authenticated is still enforced; 401 is still returned on invalid/expired tokens). Verified working end-to-end against the live deployment (register 201, login 200, protected routes 401 without/with-invalid token, 200 with valid token)."
    accepted_by: "gsd-verifier (retroactive, evidence-based — live UAT commit ebadf7c)"
    accepted_at: "2026-07-04T10:00:00Z"
human_verification:
  - test: "Close the Tauri desktop app after a successful login, then reopen it."
    expected: "The app lands directly on the wallet management screen (or any authenticated route) without requiring the user to log in again — the JWT persisted via tauri-plugin-store's file-backed store (.session.dat) survives the process restart."
    why_human: "This is a state-persistence-across-process-restart invariant. Grep/static analysis confirms the storage mechanism is wired correctly (tauri-plugin-store registered in lib.rs, capabilities/default.json grants store:default to the main window per quick task 260704-oux, session.ts uses LazyStore keyed by '__TAURI__' detection, root page.tsx checks getToken() and redirects accordingly), but no automated test exercises an actual process kill/relaunch cycle. 01-UAT.md explicitly logged this as the one still-open item ('partial' on test 3) as of 2026-07-04 — the API-level token issuance and validity was confirmed live, but the desktop restart-persistence half was not."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** All four developers can work in parallel on a correctly-configured codebase — the Tauri desktop app builds and launches, JWT auth works end-to-end via Supabase, and users can register, log in, and manage wallets
**Verified:** 2026-07-04T10:00:00Z (human verification item resolved 2026-07-05)
**Status:** passed
**Re-verification:** No — initial verification (VERIFICATION.md was never generated when the phase was originally executed, despite all 4 plans having summaries — confirmed no prior `01-VERIFICATION.md` exists in the phase directory)

**Note on evidence base:** This phase shipped with a real, documented gap between "code looked complete" and "code actually worked against the live stack." A full manual UAT re-run on 2026-07-04 (`.planning/phases/01-foundation/01-UAT.md`) found and fixed two genuine defects that a plan/summary-only review would have missed entirely: (1) the Supabase project's database was never provisioned (register/login 500'd against production), and (2) JWT verification was hardcoded for HS256 when the live Supabase project uses asymmetric JWT Signing Keys (every request would have 401'd/500'd in production even though the code "looked right" against the original plan). Both are now fixed and re-verified live. This report treats the 2026-07-04 UAT + commit evidence as authoritative alongside direct codebase inspection performed in this verification pass.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can register a new account with name/email/password; session persists across Tauri desktop app restarts without re-login | ✓ VERIFIED | Register: live UAT confirms `POST /api/auth/register` → 201 with correct shape against `https://macost-production.up.railway.app`, also reproduced via live UI. Session persistence mechanism is wired: `apps/web/lib/auth/session.ts` uses `LazyStore` from `@tauri-apps/plugin-store` when `'__TAURI__' in window`; `apps/native/src-tauri/src/lib.rs` registers `tauri_plugin_store::Builder::default().build()`; `apps/native/src-tauri/capabilities/default.json` grants `store:default` to the main window (fixed by quick task 260704-oux); `apps/web/app/page.tsx` checks `getToken()` and redirects to `/wallets` or `/login` accordingly. Manually confirmed 2026-07-05 (Hidayat): closed and reopened the desktop app after login, remained authenticated, no re-login required. See 01-UAT.md test 3. |
| 2 | User can log in and log out; all protected API endpoints return 401 for requests lacking a valid Supabase JWT | ✓ VERIFIED | Live UAT (2026-07-04): `POST /api/auth/login` → 200 with working `access_token`; `GET /api/wallets` no-Authorization-header → 401 `{"detail":"Not authenticated"}`; `GET /api/wallets` invalid/malformed bearer token → 401 `{"error":{"code":"UNAUTHORIZED","message":"Token tidak valid"}}` (previously 500 before the JWKS fix in commit `ebadf7c`, confirmed fixed). Logout is a simple, low-risk client-side action (`clearToken()` + `router.push('/login')`) confirmed present in `apps/web/app/wallets/page.tsx` (`handleLogout`) — no async race or persistence invariant involved, so presence+wiring is sufficient here. |
| 3 | User can create, view, rename, and delete wallets (e.g., GoPay, Cash, Bank BCA) | ✓ VERIFIED | Live UAT (2026-07-04) end-to-end against the real deployment: `POST /api/wallets` → 201 (`nama_dompet: "GoPay"`, `saldo: 0`); `GET /api/wallets` shows it; `PUT /api/wallets/{id}` → 200 renamed "GoPay" → "GoPay Utama"; `DELETE /api/wallets/{id}` → 204, follow-up `GET` confirms removal. Backend (`backend/routers/wallets.py`) double-`.eq()` filters by `id_dompet` + `id_pengguna` on every mutating call — user-scoped isolation confirmed by direct code read. Frontend (`apps/web/app/wallets/page.tsx`) wires add/rename/delete UI to `apiMutate` calls and re-renders state on success. |
| 4 | Running `tauri build` produces a desktop app that launches to the auth screen without a blank screen (Android out of scope) | ✓ VERIFIED | Quick task 260702-qs7: `tauri build --debug --no-bundle` compiles cleanly, produces `target/debug/macost.exe`; human (Hidayat) confirmed the window opens and renders visible UI after a missing `app.windows` config was fixed in `tauri.conf.json`. 01-UAT.md test 1 re-confirms 2026-07-04: "still opens to auth screen" after Phase 01.1. `apps/native/src-tauri/tauri.conf.json` currently has `build.frontendDist: "../../web/out"` correctly pointing at the static export output, and `app.windows` array is populated. |
| 5 | Frontend switches cleanly between mock data and the real API by toggling USE_MOCK — no other code changes required | ✓ VERIFIED | Direct code read of `apps/web/lib/api/client.ts` lines 84-91: `apiFetch` branches purely on `process.env.NEXT_PUBLIC_USE_MOCK === "true"` — true routes to `resolveMock(path)` (static JSON imports, no network call), anything else calls the real API at `NEXT_PUBLIC_API_BASE_URL` with `Authorization` header from `getToken()`. This is deterministic conditional logic (not a runtime state machine), so code presence is sufficient evidence. 01-UAT.md test 8 independently confirms via code inspection and confirms production is running with `USE_MOCK=false` successfully. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/next.config.ts` | `output: 'export'`, `images.unoptimized: true`, `trailingSlash: true` | ✓ VERIFIED | All three properties present exactly as specified. |
| `apps/native/src-tauri/tauri.conf.json` | `build.frontendDist` → static export output; CSP scoped to live backend + Supabase | ✓ VERIFIED | `frontendDist: "../../web/out"`; CSP `connect-src` includes `https://macost-production.up.railway.app` (fixed from dead Render URL by quick task 260704-jd2) and `https://*.supabase.co`; `bundle.android.minSdkVersion: 24` present (unused under desktop-only scope but harmless). |
| `apps/native/src-tauri/Cargo.toml` | `tauri-plugin-store = "2"` | ✓ VERIFIED | Present under `[dependencies]`. |
| `apps/native/src-tauri/src/lib.rs` | plugin registered before `.run()` | ✓ VERIFIED | `.plugin(tauri_plugin_store::Builder::default().build())` chained onto the builder. |
| `apps/native/src-tauri/capabilities/default.json` | grants `store:default` to main window | ✓ VERIFIED (not in original PLAN must_haves, but required for the plugin to function — added by quick task 260704-oux; without it, the plugin registered in lib.rs is inert per Tauri v2's ACL model) | File exists, grants `core:default` + `store:default` to window `"main"`. |
| `backend/requirements.txt` | PyJWT, supabase, fastapi, no python-jose | ✓ VERIFIED | Contains `PyJWT>=2.9.0`, `supabase>=2.0.0`, `fastapi>=0.138.2`; no `python-jose` string anywhere. |
| `backend/dependencies/auth.py` | JWT verification, audience=authenticated, 401 on invalid/expired | ✓ VERIFIED (with override — see frontmatter) | Rewritten 2026-07-04 (commit `ebadf7c`) to use `PyJWKClient` against Supabase's JWKS endpoint instead of the originally-planned hardcoded HS256 secret; `audience="authenticated"` still enforced; `ExpiredSignatureError` → 401 `TOKEN_EXPIRED`, `PyJWTError` → 401 `UNAUTHORIZED`. Live-verified working. |
| `backend/routers/auth.py` | register/login matching API_CONTRACT.md | ✓ VERIFIED | Both endpoints present, response shapes match `{id_pengguna, nama, email, access_token}` / `{access_token, id_pengguna}`; error codes `EMAIL_TAKEN` (400), `INVALID_CREDENTIALS` (401), `ACCOUNT_LOCKED` (423) all present. |
| `backend/routers/wallets.py` | GET/POST/PUT/DELETE, all behind JWT dependency | ✓ VERIFIED | All 4 handlers inject `Depends(get_current_user_id)`; double `.eq()` filter on wallet_id + user_id for PUT/DELETE. |
| `backend/core/supabase.py` | `get_supabase_admin()` / anon client | ✓ VERIFIED (per SUMMARY; not independently re-read this pass but referenced consistently by both routers) | Imported and used by `auth.py` and `wallets.py`. |
| `backend/main.py` | CORS with Tauri origins | ✓ VERIFIED | `allow_origins` includes `tauri://localhost`, `https://tauri.localhost`, `http://tauri.localhost` (added by quick task 260704-ogx), `http://localhost`, `http://localhost:3000`, `https://macost.vercel.app`, plus a Vercel preview regex. |
| `apps/web/lib/api/client.ts` | `apiFetch`/`apiMutate` with USE_MOCK toggle + auth header | ✓ VERIFIED | Both functions present; mock/real branch confirmed (see truth 5); `await getToken()` correctly awaited (an earlier sync-call bug was caught and fixed per 01-04-SUMMARY.md). |
| `apps/web/lib/api/types.ts` | TS interfaces matching API_CONTRACT.md | ✓ VERIFIED (per SUMMARY + passing `tsc --noEmit`) | `npx tsc --noEmit` re-run in this verification pass exits 0 with zero errors. |
| `apps/web/lib/auth/session.ts` | `getToken`/`setToken`/`clearToken`, Tauri vs. browser branching | ✓ VERIFIED | All three async exports present; `LazyStore` used (correct fix for `Store`'s private constructor in v2.4.3) when Tauri detected, `localStorage` otherwise. |
| `apps/web/app/(auth)/register/page.tsx`, `login/page.tsx` | Forms per Figma, wired to real endpoints | ✓ VERIFIED | Both call `apiMutate` against the real endpoints, `setToken()` on success, redirect to `/wallets`; login shows exact `"Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit."` message on `ACCOUNT_LOCKED`. |
| `apps/web/app/wallets/page.tsx` | Wallet list + add/rename/delete UI | ✓ VERIFIED | Auth guard on mount via `getToken()`; full CRUD wired to `apiFetch`/`apiMutate`; logout button present. |
| `apps/web/mocks/wallets.json` | Matches `GET /api/wallets` shape | ✓ VERIFIED | `{"wallets": [...]}` top-level key, UUID-format `id_dompet`, integer `saldo`, 3 entries. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `apps/web/next.config.ts` (`output: 'export'`) | `apps/native/src-tauri/tauri.conf.json` (`build.frontendDist`) | Static export output directory | ✓ WIRED | `frontendDist: "../../web/out"` correctly resolves to the `apps/web/out/` produced by `next build`. |
| `tauri-plugin-store` (Rust, Cargo.toml) | `@tauri-apps/plugin-store` (npm, package.json) | Matching plugin pair for session adapter | ✓ WIRED | Both present; capability grant (`capabilities/default.json`) also confirmed present — this is the piece the original PLAN did not anticipate and that would have silently broken the plugin without the later fix. |
| `backend/dependencies/auth.py` (`get_current_user_id`) | All `/api/wallets/*` handlers | `Depends(get_current_user_id)` | ✓ WIRED | Confirmed on all 4 wallet route handlers by direct code read. |
| `SUPABASE_URL` / JWKS endpoint | `jwt.decode` verification | `PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")` | ✓ WIRED | Live-verified: valid tokens accepted (200), invalid tokens correctly rejected (401, not 500). |
| CORS `allow_origins` | Tauri WebView / Vercel frontend network calls | `CORSMiddleware` | ✓ WIRED | Origins list covers Tauri, localhost dev, and the live Vercel deployment + preview regex. |
| `apps/web/lib/api/client.ts` (`getToken()`) | `apps/web/lib/auth/session.ts` | Import + `await` | ✓ WIRED | Confirmed both the import and the `await` fix (post-dating an earlier sync-call bug caught during Plan 01-04). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-02, 01-04 | User dapat mendaftar akun baru dengan nama, email, dan password | ✓ SATISFIED | Live UAT 201 + register page wired. |
| AUTH-02 | 01-01, 01-02, 01-04, quick-260704-oux | Login + sesi persisten di Tauri (via tauri-plugin-store, bukan localStorage) | ⚠️ SATISFIED except restart-persistence unverified | Login live-verified 200; persistence mechanism wired (incl. the capability-grant fix); actual restart survival is the one open human-verification item. |
| AUTH-03 | 01-04 | User dapat logout | ✓ SATISFIED | `clearToken()` + redirect wired in wallets page. |
| AUTH-04 | 01-02 | Semua endpoint terproteksi oleh JWT Supabase | ✓ SATISFIED (via override — JWKS multi-alg instead of planned hardcoded HS256) | Live-verified 401 on missing/invalid token, 200 on valid token, against the actual production Supabase project. |
| WALL-01 | 01-02, 01-04 | User dapat membuat dompet baru | ✓ SATISFIED | Live UAT 201. |
| WALL-02 | 01-02, 01-04 | User dapat melihat daftar dompet beserta saldo | ✓ SATISFIED | Live UAT GET returns list; UI renders `Rp {saldo.toLocaleString('id-ID')}`. |
| WALL-03 | 01-02, 01-04 | User dapat mengedit nama dompet | ✓ SATISFIED | Live UAT PUT 200. |
| WALL-04 | 01-02, 01-04 | User dapat menghapus dompet | ✓ SATISFIED | Live UAT DELETE 204. |

No orphaned requirements: `REQUIREMENTS.md`'s traceability table maps AUTH-01 through WALL-04 to Phase 1 and marks all 8 "Complete", matching what all 4 plans declared in their `requirements` frontmatter.

### Anti-Patterns Found

None. Scanned `backend/routers/auth.py`, `backend/routers/wallets.py`, `backend/dependencies/auth.py`, `backend/core/supabase.py`, `apps/web/lib/api/client.ts`, `apps/web/lib/auth/session.ts`, `apps/web/app/wallets/page.tsx`, and both `(auth)/*/page.tsx` files for `TODO`/`FIXME`/`XXX`/`TBD`/`HACK`/`PLACEHOLDER`/"not yet implemented" markers — the only hits were HTML `placeholder="..."` input attributes, which are legitimate UI affordances, not stub markers.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend type-checks cleanly (all Phase 1 files included) | `npx tsc --noEmit` from `apps/web/` | Exits 0, zero errors/output | ✓ PASS |
| Backend has no `python-jose` anywhere, PyJWT present | `grep` over `requirements.txt` | `PyJWT>=2.9.0` present, `python-jose` absent | ✓ PASS |
| Tauri plugin + capability wiring | direct file read of `Cargo.toml`, `lib.rs`, `capabilities/default.json` | plugin registered, capability grants `store:default` to `main` | ✓ PASS |
| Live auth + wallet CRUD against production | curl-based checks documented in `01-UAT.md`, re-confirmed by commit `ebadf7c`'s summary | register 201, login 200, wallets 401/201/200/204 as expected | ✓ PASS (evidence from 2026-07-04 live re-run, not re-executed in this pass since it requires live credentials/network access outside this verification's scope) |

### Human Verification Required

### 1. Tauri desktop session survives an actual app restart

**Test:** Log in on the Tauri desktop build, then fully close the app (not just navigate away) and reopen it.
**Expected:** The app lands on the wallet management screen (or wherever an authenticated route routes to) without prompting for login again.
**RESOLVED (2026-07-05):** Manually confirmed by Hidayat — closed and reopened the desktop app after login, session remained authenticated, no re-login required. See `01-UAT.md` test 3.

## Gaps Summary

No blocking gaps. All 8 requirement IDs (AUTH-01 through WALL-04) are structurally implemented and verified working end-to-end against the actual production stack (not just plan/summary claims) as of the 2026-07-04 UAT re-run. Two real defects that would have blocked Phase 2 entirely — an unprovisioned Supabase database and a JWT algorithm mismatch against the live Supabase project's asymmetric signing keys — were found and fixed in that same session (commits tracked via quick tasks `260704-bud` and `260704-d4c`/`ebadf7c`). The one remaining human-verification item (session persistence surviving an actual desktop app restart) was manually confirmed 2026-07-05.

## Acknowledged Gaps

- **01-UAT.md test 8 (USE_MOCK toggle) — resolved on code-inspection evidence (2026-07-05, Hidayat).** Toggling `NEXT_PUBLIC_USE_MOCK` requires a separate Next.js build (the flag is inlined at build time in `apps/web/lib/api/client.ts`), which is outside the scope of testing a single live deployment. Direct code read confirms the branch logic is implemented correctly and deterministic (mock JSON when `USE_MOCK=true`, real API calls otherwise — not a runtime state machine, so code presence is sufficient evidence, same standard applied elsewhere in this report). The current production build runs with `USE_MOCK=false` successfully. Accepted as passing rather than forcing a separate rebuild+test cycle before Phase 2.

---

*Verified: 2026-07-04T10:00:00Z*
*Verifier: Claude (gsd-verifier)*
</content>
