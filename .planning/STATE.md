---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
current_phase_name: core-product-loop
status: executing
stopped_at: Completed 02-14-PLAN.md
last_updated: "2026-07-06T23:32:55.201Z"
last_activity: 2026-07-07
last_activity_desc: Completed 02-14-PLAN.md (Dashboard aggregation + central router wiring)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 22
  completed_plans: 15
  percent: 68
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Saat side income masuk, sistem langsung menyarankan alokasi ke goal prioritas tertinggi (SAW) — dengan suggest-and-confirm yang tidak pernah auto-execute
**Current focus:** Phase 02 — core-product-loop

## Current Position

Phase: 02 (core-product-loop) — EXECUTING
Plan: 8 of 15 (02-14 just completed; parallel-wave execution, remaining: 02-03, 02-06, 02-07, 02-08, 02-11, 02-13, 02-15)
Status: Executing
Last activity: 2026-07-07 -- Completed 02-14-PLAN.md (Dashboard aggregation + central router wiring)

Progress: [███████░░░] 68%

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 01.1 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P02 | 25m | 3 tasks | 8 files |
| Phase 01-foundation P4 | 25m | 3 tasks | 7 files |
| Phase 02-04 PSAW Ranking Engine | 25min | 2 tasks | 3 files |
| Phase 02-core-product-loop P05 | 30min | 2 tasks | 6 files |
| Phase 02-core-product-loop P09 | 5min | 2 tasks | 4 files |
| Phase 02 P10 | 25min | 2 tasks | 8 files |
| Phase 02 P12 | 6min | 2 tasks | 5 files |
| Phase 02-core-product-loop P14 | 15min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: Static export for Tauri — `output: export` + `images.unoptimized: true` must be added to next.config.ts on Day 1; Tauri APK shows blank screen without it
- [2026-07-02]: Scope revised — MVP is web app (apps/web) + Tauri **desktop** build only; Tauri mobile/Android APK is out of scope for this milestone (blocked by blank-screen bug + heavy on dev hardware, ~1 week left to demo). See PROJECT.md Key Decisions and ROADMAP.md Phase 999.1.
- [2026-07-04, FINAL]: PWA fallback also moved to post-MVP — no longer an active contingency if Tauri fails. MVP = Web (Vercel) + Tauri Desktop only. Android and PWA both revisited after MVP ships. See PROJECT.md Constraints/Out of Scope, ROADMAP.md Phase 999.1.
- [Pre-phase]: PyJWT (not python-jose) for FastAPI JWT verification — python-jose is abandoned and broken on Python 3.10+
- [Pre-phase]: tauri-plugin-store for Supabase session persistence — localStorage is unreliable in Tauri Android WebView
- [Pre-phase]: AI/vision provider not yet selected — must decide at Phase 3 start; blocks SCAN-01 and AIINS-01
- [01-03]: Static JSON imports for mocks (not fetch) — works in static export/Tauri without moving files to public/
- [01-03]: apiFetch handles reads (mock-able); apiMutate always calls real API — keeps mutation paths clean
- [01-03]: getToken() stub returns null until Track D merges Supabase session persistence layer
- [Phase ?]: Use PyJWT (not python-jose) for Supabase JWT verification
- [2026-07-04, superseded]: ~~JWTBearer: algorithms=[HS256] + audience=authenticated both required for Supabase token validation~~ — superseded by JWKS-based verification (see 260704-d4c below); `audience="authenticated"` check still required regardless of algorithm.
- [Phase ?]: Separate admin client (SERVICE_ROLE_KEY) and anon client (ANON_KEY) — admin creates users, anon issues tokens
- [01.1-03]: Backend deploy target switched from Render to Railway — Render's card verification kept failing; Railway deploys the same Dockerfile with a one-line CMD change for `${PORT:-8000}`. Live at `https://macost-production.up.railway.app`. render.yaml removed.
- [01.1-03]: Railway requires manually generating a public domain per service (Settings -> Networking -> Generate Domain) — no auto-assigned URL like Render's
- [01.1-03]: `/health` route must use `@app.api_route(methods=["GET","HEAD"])`, not `@app.get` alone — UptimeRobot's HEAD-based checks return 405 on GET-only routes
- [Phase ?]: [2026-07-05, quick-260705-0mm]: Hidayat is sole account holder for Vercel/Railway/Supabase — Phase 2/3/4 tasks needing new env vars or dashboard settings must be scoped as separate Hidayat-only tasks, never blocking Fertika/Khayyira/Zarra (placeholder/mock first, wire real value after). Rule locked in CLAUDE.md/.claude/CLAUDE.md/.planning/PROJECT.md; workflow detail in docs/PANDUAN_TEKNIKAL_TIM.md Section 2a.
- [Phase ?]: TC-01/02/04 locked into saw_engine.py: strategy re-weighting via multiply-then-renormalize (internal-only, weights dict never mutated), skor_kepentingan/saving_capacity_raw expected pre-computed on goal dicts by the caller
- [Phase ?]: tipe_transaksi/source_label always derived server-side from kategori row; TransactionCreate.tipe_transaksi accepted but never read (D-01/Pitfall 1, T-2-02)
- [Phase ?]: GET /api/transactions unconditionally scopes by id_pengguna in addition to any optional filter (T-2-01 IDOR mitigation)
- [Phase ?]: GET /api/categories intentionally has no id_pengguna scoping -- kategori is shared/unscoped read-only per kategori_select_all RLS policy
- [Phase ?]: dompet.saldo stored column left in schema/insert path (legacy, cosmetic) but no read path uses it anymore; GET /api/wallets computes saldo live as derived SUM over transaksi
- [Phase ?]: PUT /api/transactions/{id} re-derives tipe_transaksi/source_label from kategori exactly like POST, never trusting body.tipe_transaksi (T-2-02)
- [Phase ?]: [02-10]: Widened PUT /api/goal-settings weight-sum tolerance from 0.001 to 0.002 -- CLAUDE.md's locked default weights (22.5/21.9/21.5/17.8/16.2%) sum to a real 0.999, not floating-point dust; 0.001 would reject the exact default weights re-sent via the D-05 strategy-toggle flow (Pitfall 7's own warning sign).
- [Phase ?]: [02-12]: Pending allocation state derived implicitly (absence of alokasi row), not a new skipped_suggestion table -- keeps schema scope at exactly the 6 already-pushed migrations; skip is a pure read+compute echo with zero DB writes
- [Phase ?]: [02-12]: GET /transactions/{id}/allocation-suggestion independently re-validates tipe_transaksi/source_label server-side rather than trusting allocation_suggestion_available from creation time
- [Phase 02-core-product-loop]: 02-14: overspending_alert trailing-3-month baseline is defined relative to the selected period's start (not to 'today'), so a category is never compared against a baseline that includes its own current-period total
- [Phase 02-core-product-loop]: 02-14: backend/main.py now registers all 6 Phase 2 routers (categories, transactions, goals, goal_settings, allocations, dashboard) alongside the unmodified Phase 1 auth/wallets routers -- backend is fully wired
- [Phase 02-core-product-loop]: 02-14: backend pytest must be invoked via 'python -m pytest' from repo root, not bare 'pytest' -- backend/pytest.ini's presence anchors rootdir at backend/ under plain pytest, breaking 'from backend.routers import ...' imports

### Pending Todos

- Verify Android NDK toolchain and build test APK (`.planning/todos/pending/2026-07-02-verify-android-ndk-toolchain-and-build-test-apk.md`) — non-blocking, backlog only (Phase 999.1); Android is out of MVP scope as of 2026-07-02

### Blockers/Concerns

- ~~Plan 01-01 (Track A) Task 3 (Android APK) blank-screen bug~~ — no longer a blocker for Phase 1/2. Descoped from MVP on 2026-07-02: Tauri Android is backlog-only (Phase 999.1). Android `libmacost_lib.so` bug remains unresolved but out of scope.
- ~~Tauri desktop build/render unverified~~ — RESOLVED 2026-07-02 via quick task 260702-qs7: found and fixed a missing `app.windows` array in `tauri.conf.json` (Tauri v2 never spawns a window without it — that's why only the debug console appeared). Rebuilt, Hidayat confirmed the window renders correctly. Commit `625da25`. Phase 1 success criterion #4 (desktop-scoped) is now met.
- ~~UptimeRobot keep-alive for backend~~ — RESOLVED 2026-07-03: Vercel, Railway, and UptimeRobot all connected and verified live (Plan 01.1-03). Backend deploy target is Railway (`https://macost-production.up.railway.app`), not the originally-planned Render. UptimeRobot monitor confirmed "Up" at a 5-minute interval after fixing a `/health` HEAD-request 405 bug.
- ~~AI/vision provider selection~~ — RESOLVED 2026-07-02: Gemini Flash (`gemini-2.5-flash`) via Google AI Studio, free tier, documented in `API_CONTRACT.md` and `CLAUDE.md` ## AI Vision & LLM. Used for both scan-receipt and upload-statement. Dual-path with manual fallback (no auto-retry). AI Financial Assistant (F6) provider still tentative — likely same model, not finalized.
- ~~Supabase database/project not provisioned~~ — RESOLVED 2026-07-04 by Hidayat: created the Supabase project, ran `backend/migrations/001_create_dompet.sql`, set `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` in Railway. Register/login now return 201/200 against the live deployment (previously 500).
- ~~JWT verification 500 instead of 401 on invalid tokens~~ — RESOLVED 2026-07-04, quick task `260704-d4c`, commit `ebadf7c` (merged to `main`). Root cause: the live Supabase project uses the newer asymmetric "JWT Signing Keys" system (ES256), and `backend/dependencies/auth.py` was hardcoded for legacy HS256 + a manually-copied shared secret that Supabase doesn't expose for that key type at all (confirmed by inspecting the JWKS endpoint directly — it never published an HS256 key, only ES256). Fixed by rewriting the dependency to verify via Supabase's JWKS endpoint (`PyJWKClient`) instead — works regardless of which asymmetric algorithm is currently active. All wallet CRUD + auth checks now pass end-to-end against the live deployment (register 201, login 200, GET/POST/PUT/DELETE /api/wallets 200/201/200/204, no-token 401, invalid-token 401). Full detail: `.planning/phases/01-foundation/01-UAT.md`. **Phase 2 is now unblocked on the Auth+Wallet foundation.**
- ~~Login on macost.vercel.app showed "Email atau password salah" for a valid test account~~ — RESOLVED 2026-07-04. Root cause: Vercel's `NEXT_PUBLIC_API_BASE_URL` env var was still baked with the old pre-pivot Render URL (`https://macost-api.onrender.com`, confirmed dead — 404) instead of the live Railway URL, discovered by extracting the deployed JS bundle and grepping for the inlined `apiMutate` base URL. Every login/register request silently failed as a raw network error. Fixed by Hidayat updating the Vercel env var + redeploy. Contributing bug also fixed in code: `apps/web/app/(auth)/login/page.tsx` and `register/page.tsx` blindly rendered any caught error (including raw `fetch()`/network exceptions) as a credentials-blaming fallback message — fixed via quick task `260704-ili` (commit `2d98e42`), adding an `isApiErrorBody` type guard so unstructured/network errors now show an honest "Tidak dapat terhubung ke server" message instead.
- ~~Tauri desktop `.exe` shows old create-next-app scaffold / stale CSP~~ — RESOLVED. Root page redirect fix (`260704-h5i`) and CSP fix to whitelist Railway (`260704-jd2`, commit `d31602f`) are both baked into the rebuilt desktop app; `apps/web/.env.example` documents the required `NEXT_PUBLIC_API_BASE_URL` for Tauri builds (commit `b4dd64c`). Superseded by the full CORS + session-persistence fix chain below — all confirmed working end-to-end by the user on 2026-07-04.
- ~~Tauri release desktop build shows "Tidak dapat terhubung ke server" on login~~ — ROOT CAUSE FOUND AND FIXED 2026-07-04. After ruling out wrong exe, Windows Firewall, general network/DNS, and (mistakenly, per initial curl tests) CORS, quick task `260704-o31` enabled Tauri's `devtools` Cargo feature (temporary) so DevTools could be opened in the release build. User reproduced the bug with DevTools open and got the exact browser console error: `Access to fetch at 'https://macost-production.up.railway.app/api/auth/login' from origin 'http://tauri.localhost' has been blocked by CORS policy: ... No 'Access-Control-Allow-Origin' header is present`. WebView2 on this Windows setup sends `Origin: http://tauri.localhost` (HTTP), but `backend/main.py`'s CORS `allow_origins` only had `https://tauri.localhost` (HTTPS) — confirmed via curl preflight: `http://tauri.localhost` origin → 400 with no CORS header, `https://tauri.localhost` → 200. Fixed via quick task `260704-ogx` (commit `4fb3c2a`), PR #2 merged to `main`, Railway redeployed — user confirmed (2026-07-04) login now works end-to-end from the Tauri desktop app.
- ~~Tauri desktop session doesn't persist across app restarts~~ — ROOT CAUSE FOUND AND FIXED 2026-07-04 (Phase 1 UAT test #3 in `01-UAT.md` had flagged this as unverified). First hypothesis (quick task `260704-oux`, commit `b7e9f3c`: added missing `apps/native/src-tauri/capabilities/default.json` granting `core:default`+`store:default`, since the project had zero Tauri v2 capability files) was a real gap but not the actual cause — user rebuilt and retested, bug persisted. Deeper investigation (direct inspection of the WebView2 profile's `Local Storage` leveldb data on disk) revealed the true chain: (1) `window.__TAURI__` is never injected in this build — it requires `app.withGlobalTauri: true` in `tauri.conf.json`, which isn't set — so `session.ts`'s `getStore()` always falls back to `localStorage`, never reaching the Tauri Store plugin at all (the `260704-oux` capabilities fix was correct but irrelevant, since that code path is never exercised); (2) despite that, the JWT **was** being correctly persisted to `localStorage` under origin `http://tauri.localhost` — confirmed via multiple historical `access_token` entries in the leveldb log across several login sessions; (3) the actual bug: `apps/web/app/page.tsx` (from quick task `260704-h5i`) redirected to `/login` unconditionally on every launch regardless of any stored token, so users always saw the login form again even with a valid session. Fixed via quick task `260704-pju` (commit `42d94cf`): root page now checks `getToken()` first and routes to `/wallets` if present, `/login` otherwise. **User confirmed 2026-07-04:** login → close app → reopen now lands on `/wallets` without re-login. Temporary `devtools` Cargo feature reverted via quick task `260704-pyx` (commit `caf2b4b`) now that debugging is complete. **Known non-blocking follow-up:** `session.ts`'s `'__TAURI__' in window` check is not Tauri v2's correct runtime-detection method and should eventually be replaced (e.g. with `isTauri()` from `@tauri-apps/api/core` or checking `window.__TAURI_INTERNALS__`) — currently harmless on desktop since localStorage works reliably there, but per `CLAUDE.md`'s own rationale ("localStorage is unreliable in Tauri Android WebView") this could matter for the post-MVP Android target (Phase 999.1).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260702-j95 | Add Neulis and Helvetica local fonts to apps/web via next/font/local | 2026-07-02 | 7576b46 | [260702-j95-add-neulis-and-helvetica-local-fonts-to-](./quick/260702-j95-add-neulis-and-helvetica-local-fonts-to-/) |
| 260702-qs7 | Verify Tauri desktop build works (found + fixed missing app.windows config) | 2026-07-02 | 625da25 | [260702-qs7-verify-tauri-desktop-build-works](./quick/260702-qs7-verify-tauri-desktop-build-works/) |
| 260702-r8s | Document AI vision model decision (Gemini Flash) in API_CONTRACT.md and CLAUDE.md | 2026-07-02 | c90b077 | [260702-r8s-update-api-contract-md-and-claude-md-wit](./quick/260702-r8s-update-api-contract-md-and-claude-md-wit/) |
| 260704-axu | Investigasi status Phase 1 (termasuk fix 01.1), roadmap, deployment, dan tulis docs/PANDUAN_TEKNIKAL_TIM.md untuk Fertika, Khayyira, Zarra | 2026-07-04 | f97c9dd | [260704-axu-investigasi-status-phase-1-termasuk-fix-](./quick/260704-axu-investigasi-status-phase-1-termasuk-fix-/) |
| 260704-bud | Re-run UAT Phase 1 terhadap stack live dan update dokumentasi mobile post-MVP | 2026-07-04 | fb2d452 | [260704-bud-re-run-uat-phase-1-terhadap-stack-live-d](./quick/260704-bud-re-run-uat-phase-1-terhadap-stack-live-d/) |
| 260704-d4c | Fix JWT verification to use Supabase JWKS instead of hardcoded HS256 secret (found + fixed while helping Hidayat provision Supabase) | 2026-07-04 | ebadf7c | [260704-d4c-fix-jwt-verification-to-use-supabase-jwk](./quick/260704-d4c-fix-jwt-verification-to-use-supabase-jwk/) |
| 260704-dbh | Update docs/PANDUAN_TEKNIKAL_TIM.md dengan status terbaru Phase 1 (UAT passing) dan Android/PWA post-MVP final | 2026-07-04 | 1a81e3a | [260704-dbh-update-docs-panduan-teknikal-tim-md-deng](./quick/260704-dbh-update-docs-panduan-teknikal-tim-md-deng/) |
| 260704-h5i | Ganti root page apps/web/app/page.tsx dari template create-next-app menjadi redirect ke /login | 2026-07-04 | 7a83828 | [260704-h5i-ganti-root-page-apps-web-app-page-tsx-da](./quick/260704-h5i-ganti-root-page-apps-web-app-page-tsx-da/) |
| 260704-ili | Perbaiki error handling menyesatkan di login/register (bedakan structured API error vs raw network failure) | 2026-07-04 | 2d98e42 | [260704-ili-perbaiki-error-handling-menyesatkan-di-l](./quick/260704-ili-perbaiki-error-handling-menyesatkan-di-l/) |
| 260704-jd2 | Fix Tauri desktop CSP (dead Render URL -> live Railway URL) and document Tauri build-time env var requirement in apps/web/.env.example | 2026-07-04 | d31602f, b4dd64c | [260704-jd2-fix-tauri-csp-dan-env-example-untuk-back](./quick/260704-jd2-fix-tauri-csp-dan-env-example-untuk-back/) |
| 260704-o31 | Enable Tauri devtools (temporary) to debug release build login connection failure | 2026-07-04 | f167a25 | [260704-o31-aktifkan-devtools-sementara-di-tauri-bui](./quick/260704-o31-aktifkan-devtools-sementara-di-tauri-bui/) |
| 260704-ogx | Fix CORS: whitelist http://tauri.localhost (root cause of Tauri desktop login failure) | 2026-07-04 | 4fb3c2a | [260704-ogx-fix-cors-backend-tambahkan-http-tauri-lo](./quick/260704-ogx-fix-cors-backend-tambahkan-http-tauri-lo/) |
| 260704-oux | Fix Tauri session persistence: add capabilities/default.json (core:default + store:default) | 2026-07-04 | b7e9f3c | [260704-oux-fix-tauri-session-persistence-tambah-cap](./quick/260704-oux-fix-tauri-session-persistence-tambah-cap/) |
| 260704-pju | Fix root page.tsx to check session token before redirecting (actual root cause of session-persistence bug) | 2026-07-04 | 42d94cf | [260704-pju-fix-root-page-tsx-cek-session-token-dulu](./quick/260704-pju-fix-root-page-tsx-cek-session-token-dulu/) |
| 260704-pyx | Revert temporary Tauri devtools feature after debugging session | 2026-07-04 | caf2b4b | [260704-pyx-revert-devtools-feature-di-cargo-toml-se](./quick/260704-pyx-revert-devtools-feature-di-cargo-toml-se/) |
| 260704-q9r | Update docs/PANDUAN_TEKNIKAL_TIM.md with Tauri debugging session findings (login CORS + session persistence) | 2026-07-04 | b9cec46 | [260704-q9r-revisi-docs-panduan-teknikal-tim-md-deng](./quick/260704-q9r-revisi-docs-panduan-teknikal-tim-md-deng/) |
| 260704-quj | Add gh CLI setup and PR/merge flow explanation to docs/PANDUAN_TEKNIKAL_TIM.md | 2026-07-04 | 9c91bd5 | [260704-quj-tambah-penjelasan-setup-gh-cli-dan-alur-](./quick/260704-quj-tambah-penjelasan-setup-gh-cli-dan-alur-/) |
| 260704-r45 | Reference Notion workspace for env var sourcing instead of asking Hidayat directly | 2026-07-04 | c98b096 | [260704-r45-update-sumber-env-var-di-panduan-teknika](./quick/260704-r45-update-sumber-env-var-di-panduan-teknika/) |
| 260705-0mm | Tetapkan aturan platform ownership (Hidayat pegang akun Vercel/Railway/Supabase, Phase 2/3/4) di CLAUDE.md/PROJECT.md, tambah Section 2a di PANDUAN_TEKNIKAL_TIM.md | 2026-07-05 | b334c9d, 8ee48c0 | [260705-0mm-tetapkan-aturan-hidayat-pegang-penuh-aku](./quick/260705-0mm-tetapkan-aturan-hidayat-pegang-penuh-aku/) |
| 260706-jaq | Update 02-UI-SPEC.md dengan detail visual asli dari Figma (11 frame, 4 area Phase 2) — resolusi konflik tema (Figma light theme menang atas dark theme lama) + 5 diskrepansi di-flag sebagai Open Questions | 2026-07-06 | b8ff368, f6f83d5, 0a30379 | [260706-jaq-update-02-ui-spec-md-dengan-detail-visua](./quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/) |
| 260706-jaq (round 2) | Perdalam detail visual 8 frame Figma per user; resolusi 4 open question sesuai instruksi user (urutan KPI Dashboard tetap RESEARCH.md, bobot SAW tetap survey n=62, Pending Suggestions = antrian Smart Allocation bukan nudge AI, History = tab nav sendiri); temuan baru: diskrepansi Palette A/B warna di 2 frame | 2026-07-06 | 6f16855, b11b8ae, 39cb658 | [260706-jaq-update-02-ui-spec-md-dengan-detail-visua](./quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/) |
| 260706-jaq (round 3, final) | Resolusi final 2 keputusan tersisa: Create First Goal diimplementasi sebagai halaman onboarding penuh (bukan empty-state ringan D-06); Palette A/B distandarkan ke Palette A (bg #fcfcfc, teks #1e1e1e, blue #298dff, orange #ff8929) — Transaction History & Pending Suggestions diupdate ke token Palette A. Semua 6 Open Questions kini RESOLVED | 2026-07-06 | 617baa1 | [260706-jaq-update-02-ui-spec-md-dengan-detail-visua](./quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/) |

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: Local dev & deployment infra (Docker, .env, Vercel/Render/Supabase) - discovered blocking Phase 1 UAT testing (URGENT)
- 2026-07-04: PRD Final revision (dosen feedback, 2026-07-03) added FR-018 (Quick Access Panel) and FR-019 (AI Agent Chatbot). QAP-01 added to Phase 3 requirements/success criteria. New backlog Phase 999.2 created for AI Agent Chatbot (AIAGENT-01) — explicit post-MVP, do not plan/execute without direct user instruction.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | EXT-01: Custom user-managed categories | Deferred | 2026-06-30 |
| v2 | EXT-02: Real-time push notifications | Deferred | 2026-06-30 |
| v2 | EXT-03: Social/shared wallets | Deferred | 2026-06-30 |

## Session Continuity

Last session: 2026-07-06T23:32:09.949Z
Stopped at: Completed 02-14-PLAN.md
Resume file: None
