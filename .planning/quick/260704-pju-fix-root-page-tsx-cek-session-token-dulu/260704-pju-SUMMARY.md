---
phase: quick-260704-pju
plan: 01
subsystem: ui
tags: [nextjs, auth, session, routing, bugfix]

requires: []
provides:
  - "apps/web/app/page.tsx now checks getToken() before redirecting — routes to /wallets if a session exists, /login otherwise, instead of always forcing /login"
affects: [apps-web-routing, tauri-desktop-launch, auth-session]

tech-stack:
  added: []
  patterns:
    - "Root page reuses the same client-component presence-only token check pattern already established in wallets/page.tsx"

key-files:
  created: []
  modified:
    - apps/web/app/page.tsx

key-decisions:
  - "Presence-only check (no backend token-expiry validation) at the root page, matching wallets/page.tsx's existing convention — an expired token will naturally 401 when wallets/page.tsx tries to load data, which is the correct layer to handle that, not the root page"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "apps/web/app/page.tsx is a Client Component that calls getToken() in useEffect and routes to /wallets (token present) or /login (no token), with a non-flashing loading state in between"
    verification:
      - kind: unit
        ref: "cd apps/web && npm run lint -- passed with no errors"
        status: pass
      - kind: integration
        ref: "cd apps/web && npm run build -- static export succeeded, all 5 routes generated (/, /login, /register, /wallets, /_not-found)"
        status: pass
    human_judgment: true
    rationale: "Full end-to-end confirmation (closing and reopening the Tauri desktop app after login lands on /wallets, not /login) requires a real rebuild + manual retest, not yet done at SUMMARY time."

duration: 8min
completed: 2026-07-04
status: complete
---

# Quick Task 260704-pju: Fix root page to check session before redirecting Summary

**Fixed the actual root cause of "Tauri desktop session doesn't persist": apps/web/app/page.tsx was redirecting to /login unconditionally, regardless of whether a valid session token existed — now it checks first.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `apps/web/app/page.tsx` converted from a Server Component with an unconditional `redirect("/login")` into a Client Component that calls `getToken()` in a `useEffect` and routes to `/wallets` (token present) or `/login` (no token)
- Loading state matches the visual convention already used in `wallets/page.tsx` (dark background, centered, muted Helvetica text) — no flash of empty content while the check runs
- `npm run lint` and `npm run build` (static export, `output: 'export'`) both pass; all 5 routes generate correctly

## Task Commits

1. **Task 1: Convert page.tsx to conditional client-side redirect** - `42d94cf` (fix)

## Files Created/Modified
- `apps/web/app/page.tsx` - Now a Client Component checking `getToken()` before deciding where to route

## Decisions Made
- Followed the plan exactly: presence-only check (truthy/falsy), no JWT expiry validation or backend call at this layer — consistent with how `wallets/page.tsx` already handles this, where an actually-expired token surfaces as a 401 when data loads, not as a routing decision

## Deviations from Plan
None — implemented exactly as planned.

## Issues Encountered
None.

## Investigation Context (why this was the real fix)

This quick task resolves a debugging session that initially suspected the Tauri Store plugin (fixed via `260704-oux`, adding a missing `capabilities/default.json`). After that fix still didn't resolve the user's reported symptom, direct inspection of the WebView2 profile's `Local Storage` leveldb data on disk revealed:
1. `window.__TAURI__` is not injected in this build (requires `app.withGlobalTauri: true` in `tauri.conf.json`, which isn't set) — so `session.ts`'s `getStore()` always falls back to `localStorage`, never actually reaching the Tauri Store plugin path.
2. Despite that, the JWT `access_token` **was** being correctly persisted to `localStorage` under origin `http://tauri.localhost`, confirmed via multiple historical entries in the WebView2 profile's leveldb log — so persistence itself was never actually broken.
3. The real symptom cause: `apps/web/app/page.tsx` (from quick task `260704-h5i`) redirected to `/login` unconditionally on every app launch, regardless of any stored token — so users always saw the login form again even with a valid session, which is exactly what this quick task fixes.

**Known follow-up, not fixed here:** the `'__TAURI__' in window` check in `apps/web/lib/auth/session.ts`'s `getStore()` is not the correct Tauri v2 runtime-detection method (it requires `withGlobalTauri: true`, which this project doesn't set) — so the Tauri Store plugin path is currently dead code, and the app always uses `localStorage` on both desktop and Android. This works for desktop (WebView2 profile persistence is reliable), but per `CLAUDE.md`'s own stated rationale ("localStorage is unreliable in Tauri Android WebView"), this may still be a real problem for the Android target specifically (currently post-MVP / backlog per Phase 999.1, so not urgent). A future fix should use the correct runtime-detection primitive (e.g., checking `window.__TAURI_INTERNALS__`, or importing `@tauri-apps/api/core`'s `isTauri()` helper if available in this Tauri version) instead of `'__TAURI__' in window`.

## User Setup Required
- Rebuild the Tauri desktop app (`npm run tauri build` from `apps/native`) to pick up this fix
- Retest: log in, fully close the app, reopen it — it should land on `/wallets` directly instead of showing the login form again

## Next Phase Readiness
- This is expected to fully resolve the user-reported "session doesn't persist" bug and Phase 1 UAT test #3's "partial" result
- The `__TAURI__` detection defect noted above remains a known, non-blocking issue for a future fix (relevant mainly for the post-MVP Android target)

---
*Phase: quick-260704-pju*
*Completed: 2026-07-04*

## Self-Check: PASSED
- FOUND: apps/web/app/page.tsx
- FOUND: 42d94cf (task commit)
