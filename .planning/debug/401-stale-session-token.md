---
status: resolved
trigger: "401 Unauthorized dari GET /api/dashboard, /api/goals, /api/transactions terhadap https://macost-production.up.railway.app. Muncul di DUA tempat sekaligus: browser (macost.vercel.app) DAN app Tauri desktop. User (Day) melaporkan: session-nya sudah login sebelumnya, buka app lagi langsung masuk ke dashboard (tanpa diminta login ulang), lalu semua API call gagal 401. User juga catat: belum ada tombol logout di UI, jadi tidak bisa clear session secara manual untuk memaksa re-login."
created: 2026-07-09T02:15:00Z
updated: 2026-07-09T02:15:00Z
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

status: fixed_and_committed
next_action: Day should do the immediate unblock steps (see Fix Applied section) to clear the currently-stuck session, then pull the fix, redeploy/rebuild, and retry the 02-15 Task 2 Tauri verification walkthrough to confirm the redirect-to-login now fires cleanly. Follow-up (not blocking): sweep remaining pages for the same isAuthError pattern, and add a real logout button.

## Symptoms
<!-- Written during gathering, then immutable -->

expected: A previously-logged-in user reopening the app (browser or Tauri desktop) either has a still-valid session (dashboard loads normally) or is cleanly redirected to /login if their session has expired -- never silently lands on a dashboard that then fails every API call with 401.
actual: User's stored session routes them straight to the dashboard (no re-login prompt), but every subsequent API call (GET /api/dashboard, /api/goals, /api/transactions) returns 401 Unauthorized. No logout button exists anywhere in the UI to let the user manually clear the stale session and re-authenticate.
errors: |
  Failed to load resource: the server responded with a status of 401 ()
  macost-production.up.railway.app/api/dashboard?period=this_month:1  Failed to load resource: the server responded with a status of 401 ()
  macost-production.up.railway.app/api/goals:1  Failed to load resource: the server responded with a status of 401 ()
  macost-production.up.railway.app/api/transactions:1  Failed to load resource: the server responded with a status of 401 ()
timeline: First reported today (2026-07-09) by Day while attempting the 02-15 Task 2 manual Tauri desktop verification walkthrough, right after rebuilding the Tauri app with `tauri build`. Unknown whether this is a new regression or a pre-existing gap only now surfaced because the session in question is old (last known login activity in STATE.md history is 2026-07-04 -- Supabase access tokens default to a short TTL, commonly ~1 hour, so a multi-day-old stored token would already be well past expiry).
reproduction: Reopen the app (browser at macost.vercel.app, or the Tauri desktop app) using a browser/app profile that still has an old stored access_token from a previous login session (not a fresh login). Observe: app auto-routes to /dashboard (or equivalent authenticated landing page) without validating the token first, then every data-fetching API call 401s.
started: unknown -- not confirmed whether this is a new regression from anything in the last 24h of changes (backend auth.py was NOT touched by any of tonight's fixes -- confirmed by orchestrator: tonight's commits only touched backend/services/goal_service.py, backend/routers/allocations.py, backend/models/goal_settings.py, backend/routers/goal_settings.py, apps/web/lib/api/types.ts, apps/web/components/TransactionForm.tsx, apps/web/app/transactions/new/page.tsx, apps/web/components/AllocationSuggestionModal.tsx -- none of these are auth/session-related), so this is very likely a pre-existing gap (no refresh-token flow, no client-side expiry check, no logout button) that simply hadn't been noticed before because no one had left a session open long enough for the access token to expire during active testing.

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- `apps/web/lib/auth/session.ts` `getToken()` returns whatever is in storage (localStorage on web, Tauri Store on desktop) with NO expiry check -- it's a pure presence/absence read. No refresh-token flow exists anywhere in the frontend.
- `backend/dependencies/auth.py::get_current_user_id` correctly verifies Supabase JWTs via JWKS and raises 401 `TOKEN_EXPIRED` on `jwt.ExpiredSignatureError` -- backend behavior is correct and NOT the bug. Confirms this is 100% a frontend gap.
- `apps/web/app/page.tsx` (root `/`) only checks `token ? '/home' : '/login'` -- presence only, routes stale-token users straight to `/home`.
- `apps/web/app/home/page.tsx` (primary landing page) lines 159-171: `init()` checks `if (!token) router.push('/login')` (presence only) then calls `loadHome()`. `loadHome()` (lines 140-157) fires 4 parallel `apiFetch` calls; on failure the `catch` block ONLY does `setError('Gagal memuat halaman utama')` -- it does NOT inspect the error for a 401/TOKEN_EXPIRED code, does NOT call `clearToken()`, and does NOT redirect to `/login`. User is stuck on a generic error state with a dead session and no way out via this page.
- `apps/web/app/dashboard/page.tsx` has the identical pattern (token presence check only at init, generic catch with no 401 handling) at lines 99-111.
- `apps/web/lib/api/client.ts` `apiFetch`/`apiMutate` throw the parsed structured error body on any non-ok response but have NO centralized 401 interceptor -- every page is individually responsible for detecting auth failure, and most don't.
- Logout affordance audit: `apps/web/app/wallets/page.tsx` HAS a working, visible Logout button (line 125-129, wired to `handleLogout` which calls `clearToken()` + redirects). `apps/web/app/goals/page.tsx` defines an identical `handleLogout` function (lines 82-85) but it is DEAD CODE -- never referenced by any `onClick` in that file, so no logout button renders on the Goals page. `home/page.tsx` and `dashboard/page.tsx` (the two pages actually affected by this bug, since they're the landing pages) have NO logout affordance at all.
- Conclusion: this is a pre-existing frontend gap, not a regression -- confirmed no auth-related files were touched in the last 24h of commits (per session context). Root cause is the combination of (1) no client-side token expiry check, (2) no 401 response handler on the two landing pages that clears the token and redirects, (3) no visible logout button on the pages where users actually land.

## Fix Applied
<!-- Root cause fix, separate from any immediate user unblock steps -->

status: fixed
committed: true

### Immediate unblock (do this now, before the code fix ships)

The code fix below only prevents this from happening again — it does NOT
retroactively clear Day's currently-stuck stale token. To unblock Task 2
verification right now:

- **Browser (macost.vercel.app):** open DevTools -> Application tab ->
  Local Storage -> macost.vercel.app -> delete the `access_token` key (or
  just run `localStorage.removeItem('access_token')` in the console), then
  reload and log in again.
- **Tauri desktop app:** the token lives in a Tauri Store file
  (`.session.dat`) inside the app's data dir, not localStorage. Easiest
  unblock: fully quit the app, then log in again through the UI once the
  new build (with the fix below) is installed -- the new build will
  redirect to /login automatically on the first failed request instead of
  getting stuck, so a plain relaunch + login should now self-heal even
  without manually deleting the store file.

### Code fix (root cause)

Changed files:
- `apps/web/lib/api/client.ts` -- `apiFetch`/`apiMutate` now route non-ok
  responses through a new `throwResponseError()` helper. On HTTP 401
  specifically, it calls `clearToken()` (removing the dead token from
  localStorage/Tauri Store) and tags the thrown error with
  `isAuthError: true`. Added an exported `isAuthError(err)` type guard for
  callers to check.
- `apps/web/app/home/page.tsx` -- `loadHome()`'s catch block now checks
  `isAuthError(err)` first and redirects to `/login` (instead of just
  showing the generic "Gagal memuat halaman utama" error and leaving the
  user stuck on a dead session). This is the primary landing page
  (`/` redirects here when a token is present) and was the main page
  responsible for the reported symptom.
- `apps/web/app/dashboard/page.tsx` -- same fix applied to
  `loadDashboard()`'s catch block (was showing "Gagal memuat dashboard"
  and stopping there).

Not changed (explicitly out of scope for this fix, noted for follow-up):
- Several other authenticated pages (`goals/page.tsx`, `transactions/page.tsx`,
  `wallets/page.tsx`, `allocations/pending/page.tsx`, etc.) have the same
  bare `catch { setError(...) }` pattern and would benefit from the same
  `isAuthError` check, but none of them are the landing page a returning
  user hits first, so they're lower priority. Recommend a follow-up quick
  task to sweep all `apiFetch`/`apiMutate` call sites and add the
  `isAuthError` redirect consistently.
- `apps/web/app/goals/page.tsx` has a `handleLogout` function (calls
  `clearToken()` + redirects) that is defined but never wired to a button
  -- dead code. `apps/web/app/wallets/page.tsx` is the only page with a
  working, visible Logout button. Recommend adding a real logout
  affordance (e.g. in a shared header/profile menu) as a small follow-up
  UI task -- deferred here since it needs a UI-SPEC/design decision on
  placement, not just a code fix.
- No refresh-token flow was added. Supabase access tokens remain
  short-lived with no silent renewal; this fix ensures expiry now fails
  *gracefully* (auto redirect to login) rather than *silently* (stuck
  dashboard), but the user will still need to re-enter credentials once
  the token expires (~1hr TTL per Supabase default). A real refresh-token
  flow is a larger feature, not a debug fix, and is out of scope here.

Verification performed:
- `npx tsc --noEmit` in `apps/web/` -- clean, no new type errors.
- `npm run lint` in `apps/web/` -- no new warnings/errors introduced (all
  7 pre-existing findings are in files untouched by this fix, confirmed
  via `git status`).
- Not yet manually verified against the live Railway backend with an
  actually-expired token (requires either waiting out a real token TTL or
  Day manually testing) -- recommend Day retry the Task 2 Tauri
  verification walkthrough after this fix is deployed to confirm the
  redirect-to-login now fires instead of the silent 401 stall.

