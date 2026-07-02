---
phase: 01-foundation
plan: 4
subsystem: auth-ui
tags: [auth, session, wallets, frontend, tauri]
status: complete

dependency_graph:
  requires:
    - 01-03 (apiFetch/apiMutate from lib/api/client.ts — must be merged before this plan's client.ts fix lands)
  provides:
    - getToken/setToken/clearToken — consumed by lib/api/client.ts Authorization header
    - /register and /login pages — user-facing auth entry points
    - /wallets page — first authenticated screen
  affects:
    - apps/web/lib/api/client.ts — awaited getToken() calls (cross-track fix)

tech_stack:
  added:
    - "@tauri-apps/plugin-store v2.4.3 — LazyStore for persistent token storage in Tauri Android"
  patterns:
    - Dynamic import of tauri plugin to avoid SSR errors during static export build
    - Module-level singleton pattern for LazyStore instance
    - Route group (auth) for shared auth layout without URL prefix
    - Inline state-driven CRUD (no dynamic routes) for wallet management

key_files:
  created:
    - apps/web/lib/auth/session.ts
    - apps/web/app/(auth)/layout.tsx
    - apps/web/app/(auth)/register/page.tsx
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/wallets/page.tsx
  modified:
    - apps/web/lib/api/client.ts (await getToken() — Rule 1 deviation fix)
    - apps/web/mocks/wallets.json (UUID ids, 3 entries)

decisions:
  - Use LazyStore (public constructor) instead of Store (private constructor in v2.4.3) for Tauri session persistence
  - Dynamic import of @tauri-apps/plugin-store inside getStore() to prevent Next.js SSR/build failures
  - Error handling in login: check error.code === 'ACCOUNT_LOCKED' rather than HTTP status (apiMutate doesn't expose status code)
  - window.confirm for wallet delete confirmation (acceptable MVP approach, no modal needed)

metrics:
  duration: "~25 minutes"
  completed: "2026-07-02"
  tasks_completed: 3
  files_created: 5
  files_modified: 2
---

# Phase 01 Plan 04: Auth Pages and Wallet Management UI — Summary

Delivered the user-facing authentication entry point and first authenticated screen for Macost. The session persistence layer (session.ts) bridges Tauri Android's file-system storage with browser localStorage, and is now consumed by lib/api/client.ts for Authorization header injection on every API call.

## What Was Built

### Session Persistence Layer (`apps/web/lib/auth/session.ts`)
Three async exports: `getToken()`, `setToken(token)`, `clearToken()`. Runtime detection via `typeof window` (SSR guard) then `'__TAURI__' in window` (Tauri guard). When Tauri is detected, uses `LazyStore` from `@tauri-apps/plugin-store` via dynamic import — surviving WebView restarts on Android. Falls back to `localStorage` in browser. Module-level singleton avoids reopening the store file on every call.

### Auth Layout (`apps/web/app/(auth)/layout.tsx`)
Server component route group layout wrapping `/register` and `/login`. Dark full-height centered container (`bg-[#1e1e1e] min-h-screen flex items-center justify-center`).

### Register Page (`apps/web/app/(auth)/register/page.tsx`)
Client component with nama/email/password form. On 201: `setToken(response.access_token)` + `router.push('/wallets')`. On error: shows `error.error.message` or "Registrasi gagal". Neulis heading, Helvetica body, #ff8929 CTA, #298dff secondary link to /login.

### Login Page (`apps/web/app/(auth)/login/page.tsx`)
Client component with email/password form. On 200: `setToken(response.access_token)` + `router.push('/wallets')`. On `ACCOUNT_LOCKED` code: exact message "Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit." On other error: API message or "Email atau password salah". #298dff link to /register.

### Wallet Management Page (`apps/web/app/wallets/page.tsx`)
Client component. Auth guard on mount (getToken null → push /login). Fetches `GET /api/wallets` via `apiFetch` (returns mock data when `NEXT_PUBLIC_USE_MOCK=true`). Displays wallet cards with `Rp {saldo.toLocaleString('id-ID')}`. Inline rename (click Edit → input field → Simpan/Batal). Delete with window.confirm. "Tambah Dompet" inline form via React state. Logout button (clearToken + push /login). No dynamic routes, no Server Actions.

### Updated Mock (`apps/web/mocks/wallets.json`)
3 wallets with UUID-format ids: GoPay (Rp 250.000), Cash (Rp 50.000), Bank BCA (Rp 1.600.000). Matches `GET /api/wallets` response shape exactly.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — zero TypeScript errors |
| `npm run build` | PASS — exits 0, static export complete |
| `out/register/index.html` | FOUND |
| `out/login/index.html` | FOUND |
| `out/wallets/index.html` | FOUND |
| `grep -r "use server" app/` | PASS — none found |
| `grep -r "[id]" app/` | PASS — no dynamic segments |
| wallets.json shape | PASS — 3 entries, UUID ids, integer saldo |
| dashboard.json 5 KPI keys | PASS — expense_by_category, active_goals_summary, monthly_trend, overspending_alert, total_balance all present |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Store has private constructor in @tauri-apps/plugin-store v2.4.3**
- **Found during:** Task 1 (session.ts implementation)
- **Issue:** Plan specified `new Store('.session.dat')` but `Store` class has `private constructor()` in v2.4.3 — would produce TypeScript error TS2673 and fail at runtime
- **Fix:** Used `LazyStore` instead (public constructor, same API surface, designed for lazy initialization — identical behavior for our use case)
- **Files modified:** `apps/web/lib/auth/session.ts`
- **Commit:** 89d1b3e

**2. [Rule 1 - Bug] Synchronous getToken() calls in client.ts**
- **Found during:** Task 1 (session.ts signature change from `string | null` to `Promise<string | null>`)
- **Issue:** `client.ts` called `getToken()` synchronously in both `apiFetch` and `apiMutate`. After making getToken async, `const token = getToken()` gives a Promise object — truthy — so Authorization header would be set to `Bearer [object Promise]` on every request, breaking all API calls
- **Fix:** Added `await` to both calls: `const token = await getToken()` and `const resolvedToken = token ?? await getToken()`
- **Files modified:** `apps/web/lib/api/client.ts`
- **Commit:** 89d1b3e

## Known Stubs

None — all three pages call real apiMutate/apiFetch functions. Mock data flows through `resolveMock()` in client.ts when `NEXT_PUBLIC_USE_MOCK=true`. No hardcoded empty values in UI paths.

## Threat Flags

No new threat surface beyond what was planned in the threat model.

## Human Action Items

1. **Visual QA:** Run `NEXT_PUBLIC_USE_MOCK=true npm run dev` from `apps/web/`, visit `/register`, `/login`, `/wallets` — verify layout matches Figma frames 156:1211 (Register), 156:1322 (Login), 156:1837 (Manage Wallets). Neulis font will only render if it is locally installed on the device or loaded via CSS font-face — check heading fallback on machines without Neulis.

2. **Merge coordination (Track C/D):** `apps/web/lib/api/client.ts` was modified by this plan (await fix). Track C's branch also touches this file (swr additions). The conflict zone is the import section and the two `getToken()` call lines — merge by keeping both changes.

3. **Android test:** After Tauri `lib.rs` registers the store plugin (Track A), test that `session.dat` persists across WebView restarts on a real Android device.

## Self-Check: PASSED

Files:
- FOUND: apps/web/lib/auth/session.ts
- FOUND: apps/web/app/(auth)/layout.tsx
- FOUND: apps/web/app/(auth)/register/page.tsx
- FOUND: apps/web/app/(auth)/login/page.tsx
- FOUND: apps/web/app/wallets/page.tsx
- FOUND: apps/web/mocks/wallets.json

Commits:
- 89d1b3e: session layer + auth pages + client.ts fix
- ee994b0: wallet management page
- c4cfa2c: wallets mock update
