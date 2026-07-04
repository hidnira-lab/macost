---
phase: quick-260704-h5i
plan: 01
subsystem: ui
tags: [nextjs, app-router, redirect, static-export]

requires: []
provides:
  - "apps/web root route ('/') now redirects unconditionally to /login instead of showing the create-next-app scaffold"
affects: [apps-web-routing, tauri-desktop-launch]

tech-stack:
  added: []
  patterns:
    - "Unconditional Server Component redirect via next/navigation's redirect() for routes with no content of their own yet"

key-files:
  created: []
  modified:
    - apps/web/app/page.tsx

key-decisions:
  - "Kept page.tsx a plain Server Component calling redirect('/login') with no return/JSX after the call, per plan scope (no dashboard route exists yet)"

patterns-established:
  - "Root-level placeholder routes redirect server-side rather than rendering scaffold/dead content"

requirements-completed: []

coverage:
  - id: D1
    description: "apps/web/app/page.tsx rewritten as a Server Component that calls redirect('/login') from next/navigation, with all create-next-app scaffold JSX/imports removed"
    verification:
      - kind: unit
        ref: "cd apps/web && npm run lint (no unused-import errors) -- passed"
        status: pass
      - kind: integration
        ref: "cd apps/web && npm run build -- static export succeeded, out/index.html contains NEXT_REDIRECT digest targeting /login"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-04
status: complete
---

# Quick Task 260704-h5i: Replace root page scaffold with redirect to /login Summary

**apps/web/app/page.tsx rewritten from the create-next-app scaffold to an unconditional Server Component redirect to /login via next/navigation's redirect()**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-04T05:21:00Z
- **Completed:** 2026-07-04T05:33:25Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed the unedited create-next-app scaffold (Next.js logo, "To get started, edit the page.tsx file" heading, Templates/Learning/Deploy Now/Documentation links) from `apps/web/app/page.tsx`
- Root page is now a plain Server Component that calls `redirect('/login')` from `next/navigation` unconditionally — no `'use client'`, no `useEffect`/`useRouter`, no JSX
- Confirmed `npm run lint` and `npm run build` (static export, `output: 'export'`) both succeed with the new page
- Confirmed the built `out/index.html` embeds a `NEXT_REDIRECT;replace;/login;307;` digest that Next.js's client-side `RedirectErrorBoundary` picks up on hydration and turns into `router.replace('/login')`

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace root page scaffold with a redirect to /login** - `7a83828` (feat)

**Plan metadata:** (recorded by orchestrator in a later docs commit)

## Files Created/Modified
- `apps/web/app/page.tsx` - Rewritten from create-next-app scaffold (65 lines, `next/image` import + full JSX template) to a 6-line Server Component that imports `redirect` from `next/navigation` and calls `redirect('/login')`

## Decisions Made
- Followed the plan exactly: no session-check or "already logged in -> dashboard" branch was added, since no dashboard/home route exists anywhere under `apps/web/app/` yet (only `(auth)/login`, `(auth)/register`, and `wallets`)

## Deviations from Plan

**1. [Environment setup, not a deviation rule] Installed frontend dependencies before verification**
- **Found during:** Task 1 verification
- **Issue:** This worktree had no `apps/web/node_modules/` — `npm run lint` failed with `'eslint' is not recognized`
- **Fix:** Ran `npm ci` in `apps/web/` to install dependencies from the existing `package-lock.json` (no lockfile changes)
- **Files modified:** None tracked (node_modules is gitignored; package-lock.json untouched, verified via `git diff --stat`)
- **Verification:** `npm run lint` and `npm run build` both ran successfully afterward
- **Committed in:** N/A (no file changes to commit — dependency install only)

**2. [Verification detail differs from plan's context assumption — not a code bug] `__next-page-redirect` meta-refresh tag not present in built HTML for this Next.js version**
- **Found during:** Task 1 verification (the plan's `<verify>` step greps for the literal string `__next-page-redirect` in `out/index.html`)
- **Issue:** The plan's `<context>` section assumed Next.js bakes a `<meta id="__next-page-redirect" httpEquiv="refresh">` tag into the exported HTML for a Server Component `redirect()`. In the installed Next.js 16.2.9 build (which `apps/web/AGENTS.md` explicitly warns has breaking changes vs. training-data assumptions), that meta-tag insertion path (`renderServerInsertedHTML`) only fires for redirects thrown *during a streamed flush after the shell*. Since `page.tsx` throws the redirect synchronously at the top of the route with no Suspense boundary, Next.js instead serializes the redirect as a `NEXT_REDIRECT;replace;/login;307;` digest inside the RSC flight payload (confirmed via `grep -o "NEXT_REDIRECT[^\"]*" out/index.html`) and lets the client-side `RedirectErrorBoundary` (`node_modules/next/dist/client/components/redirect-boundary.js`) catch it on hydration and call `router.replace('/login')` inside a `useEffect`. This is the same official `redirect()` API (verified in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`), just a different internal code path than the plan's context predicted — not a bug in the implementation.
- **Fix:** No code change needed. Verified the functional outcome (redirect to `/login` fires client-side on page load) via the alternate, equally-valid mechanism instead of the literal meta-tag string match.
- **Files modified:** None
- **Verification:** `grep -o "NEXT_REDIRECT[^\"]*" out/index.html` → `NEXT_REDIRECT;replace;/login;307;`; traced client-side handling through `redirect-boundary.js`'s `HandleRedirect` component, which calls `router.replace(redirect, {})` on mount
- **Committed in:** N/A (no code change required)

---

**Total deviations:** 2 (1 environment setup, 1 verification-assumption clarification — no code bugs found)
**Impact on plan:** Both deviations are non-code; the implementation matches the plan exactly. Static export build and lint both pass, and the root route functionally redirects to /login in any JS-enabled context (browser or Tauri WebView), which is the only target for this project per CLAUDE.md.

## Issues Encountered
None beyond the two items documented above under Deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Root route no longer shows dead scaffold content; visiting "/" sends users into the auth flow
- No dashboard/home route exists yet — when one is built, this redirect will need to become conditional (redirect to dashboard if already authenticated, else /login), which is explicitly out of scope for this quick task

---
*Phase: quick-260704-h5i*
*Completed: 2026-07-04*

## Self-Check: PASSED
- FOUND: apps/web/app/page.tsx
- FOUND: 7a83828 (task commit)
