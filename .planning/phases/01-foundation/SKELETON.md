# Walking Skeleton — Macost

**Phase:** 1 — Foundation
**Generated:** 2026-07-02

## Capability Proven End-to-End

A registered user can log into the Tauri Android app, view their wallet list, and have their Supabase session persist automatically across app restarts — without re-entering credentials.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 16 App Router — static export (`output: 'export'`) | Tauri Android cannot run a Node.js server; the WebView loads static HTML from `apps/web/out/`. App Router provides route groups (auth) and query-param navigation without dynamic route segments (required for static export). |
| Mobile wrapper | Tauri 2.0 (Android APK); fallback PWA | Packages the static Next.js export as a native Android APK without rewriting the frontend. Tauri 2.0 is the only stable Tauri release with official Android support. |
| Session storage | tauri-plugin-store (NOT localStorage) | Tauri Android WebView clears `localStorage` under memory pressure and across process restarts. `tauri-plugin-store` writes to native key-value storage that survives restarts. |
| Auth approach | Frontend calls FastAPI auth endpoints; FastAPI calls Supabase Admin API | Consistent with API_CONTRACT.md which defines `POST /api/auth/register` and `POST /api/auth/login` on FastAPI. FastAPI receives the Supabase JWT and passes it back to the frontend. No direct Supabase SDK calls from frontend for auth. |
| Backend | FastAPI (Python 3.12) on Render.com | Team Python expertise; async-first; Pydantic v2 type safety; native Dependency Injection for JWT middleware. |
| Auth + database | Supabase (PostgreSQL + HS256 JWT) | Managed auth without a custom auth server; RLS for row-level data isolation; JWT verified locally in FastAPI using PyJWT without Supabase round-trips on every request. |
| JWT library | PyJWT 2.x (NOT python-jose) | python-jose is abandoned and broken on Python 3.10+. FastAPI official docs migrated to PyJWT. |
| CORS strategy | Allow-list: tauri://localhost, https://tauri.localhost, http://localhost, http://localhost:3000 | No wildcard; Tauri WebView on Android uses `http://localhost` as the origin scheme. |
| Mock strategy | Local JSON in `apps/web/mocks/`; toggle via `NEXT_PUBLIC_USE_MOCK` env var | Decouples all 4 developers; frontend builds run entirely without the backend when `USE_MOCK=true`. |
| Data fetching | SWR (`swr ^2`) for all client-side `GET` calls | Static export has no SSR; SWR fills the caching gap cleanly with minimal setup. |
| Directory layout | `apps/web/` (Next.js), `apps/native/` (Tauri), `backend/` (FastAPI) | Monorepo by deployment target; each of the 4 developers owns their directory on a separate branch. |

## Stack Touched in Phase 1

- [x] Project scaffold — Next.js 16 static export configured; FastAPI structured with routers/dependencies/models; Tauri 2.0 Android wrapper initialized
- [x] Routing — auth route group `(auth)/register`, `(auth)/login`; `/wallets` page; no dynamic `[id]` segments (incompatible with static export)
- [x] Database — Supabase: user created in `auth.users` on register; `dompet` table with user-scoped RLS for wallets
- [x] UI — Register, Login, and Wallet management pages per Figma design (color tokens from IDENTITY system, not Stitch output)
- [x] Deployment — FastAPI on Render.com with UptimeRobot keep-alive; APK built and smoke-tested on Android device

## Out of Scope (Deferred to Later Slices)

- Transaction recording (Phase 2 — TRAN-01 through TRAN-05)
- SAW goal ranking and Smart Allocation modal (Phase 2 — SAW-01 through ALLOC-05)
- Dashboard KPI rendering (Phase 2 — DASH-01, DASH-02; mock exists but page not rendered in Phase 1)
- Goals list, create, detail pages (Phase 2 — GOAL-01 through GOAL-05)
- Receipt scan, e-statement import, AI insights (Phase 3)
- Pixel art goal visualization, offline transaction queue (Phase 4)
- Token refresh / re-login after JWT expiry (post-MVP; JWTs default to 1 hour; acceptable for demo)
- Password reset, email verification UI (post-MVP)
- Custom user-managed categories (v2 — explicitly deferred per STATE.md)
- Real-time push notifications (v2 — explicitly deferred per STATE.md)
- Social/shared wallets (v2 — explicitly deferred per STATE.md)

## Subsequent Slice Plan

- Phase 2: User enters a side income transaction → SAW ranks goals → allocation modal appears within 2 seconds → user confirms → goal progress bar advances
- Phase 3: Receipt photo auto-populates transaction form; e-statement PDF bulk import; AI financial insights in Bahasa Indonesia; SAW weight customization
- Phase 4: Pixel art goal visualization; offline transaction queue with IndexedDB sync indicator
