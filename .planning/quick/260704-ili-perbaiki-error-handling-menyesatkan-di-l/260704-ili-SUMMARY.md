---
phase: quick-260704-ili
plan: 01
subsystem: auth
tags: [nextjs, error-handling, type-guard, fetch, ux]

requires: []
provides:
  - "isApiErrorBody(value: unknown) type guard exported from apps/web/lib/api/types.ts, distinguishing structured backend error bodies from raw fetch/network exceptions"
  - "Login and register catch blocks branch on isApiErrorBody(err) instead of blindly casting err as ApiErrorBody"
affects: [auth-login, auth-register, api-client]

tech-stack:
  added: []
  patterns:
    - "Runtime type guard (value is T) for narrowing unknown catch-block values before trusting their shape, instead of an unchecked `as` cast"

key-files:
  created: []
  modified:
    - apps/web/lib/api/types.ts
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/(auth)/register/page.tsx

key-decisions:
  - "isApiErrorBody implemented defensively (checks typeof value === 'object', not-null, then value.error is object, not-null, then code/message both typeof 'string') rather than assuming an object shape, since the unknown catch value could be any thrown JS value including a raw TypeError"
  - "Connection-error fallback message text ('Tidak dapat terhubung ke server. Periksa koneksi internetmu dan coba lagi.') reused verbatim on both login and register pages rather than writing two different network-error strings, since both catch blocks are handling the exact same underlying failure mode (raw fetch() exception, not a backend response)"

patterns-established:
  - "Auth page catch blocks: branch on isApiErrorBody(err) first; only trust err.error.code / err.error.message inside that branch; unstructured errors always get an honest connectivity message, never a credentials/validation-sounding fallback"

requirements-completed: []

coverage:
  - id: D1
    description: "isApiErrorBody(value: unknown): value is ApiErrorBody exported from apps/web/lib/api/types.ts, correctly narrowing by checking error.code and error.message are both strings"
    verification:
      - kind: unit
        ref: "cd apps/web && npm run lint -- passed with no errors"
        status: pass
      - kind: integration
        ref: "cd apps/web && npm run build -- Next.js 16.2.9 build succeeded, TypeScript check passed, all 5 static routes generated including /login and /register"
        status: pass
    human_judgment: false
  - id: D2
    description: "Login catch block branches on isApiErrorBody(err): structured errors keep ACCOUNT_LOCKED special case ('Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.') and err.error.message for other codes; unstructured errors (raw network/TypeError) show 'Tidak dapat terhubung ke server. Periksa koneksi internetmu dan coba lagi.' instead of the old 'Email atau password salah' fallback"
    verification:
      - kind: unit
        ref: "grep -n isApiErrorBody / ACCOUNT_LOCKED in apps/web/app/(auth)/login/page.tsx -- confirmed both present, old `as ApiErrorBody` cast removed"
        status: pass
    human_judgment: true
    rationale: "No test runner is configured for apps/web yet (per CLAUDE.md: 'Not yet configured — no test framework found'), so the actual runtime behavior of a simulated network failure vs. a real backend error on the live login form was not exercised end-to-end by an automated test; verified statically via lint/build/grep only."
  - id: D3
    description: "Register catch block mirrors the same distinction: structured error -> err.error.message; unstructured error -> honest connection-error message that does not imply submitted registration data was invalid"
    verification:
      - kind: unit
        ref: "grep -n isApiErrorBody in apps/web/app/(auth)/register/page.tsx -- confirmed present, old `as ApiErrorBody` cast and 'Registrasi gagal' fallback removed"
        status: pass
    human_judgment: true
    rationale: "Same as D2 — no automated test framework configured yet; verified statically via lint/build/grep, not via a live simulated network failure."

duration: 22min
completed: 2026-07-04
status: complete
---

# Quick Task 260704-ili: Fix misleading error handling in login/register catch blocks Summary

**Added a shared `isApiErrorBody` type guard so login/register catch blocks stop blaming credentials for raw network failures (the root cause of the earlier "Email atau password salah" false alarm during a dead-backend-URL incident)**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-04T06:12:00Z
- **Completed:** 2026-07-04T06:34:45Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `export function isApiErrorBody(value: unknown): value is ApiErrorBody` to `apps/web/lib/api/types.ts`, defensively checking that `value.error.code` and `value.error.message` are both strings before trusting the shape
- Login page's catch block now branches on `isApiErrorBody(err)`: structured backend errors keep the exact previous behavior (ACCOUNT_LOCKED special case, `err.error.message` for everything else); unstructured errors (raw `fetch()` exceptions from a dead/misconfigured backend URL, DNS failure, CORS, etc.) now show an honest "Tidak dapat terhubung ke server. Periksa koneksi internetmu dan coba lagi." message instead of the old "Email atau password salah"
- Register page mirrors the same fix, replacing the old "Registrasi gagal" blind fallback with the same honest connection-error message for unstructured failures, while structured errors still render `err.error.message` directly
- Removed the unchecked `apiErr = err as ApiErrorBody` casts and the `ApiErrorBody` type imports from both page files — the structural check now lives in exactly one place (`apps/web/lib/api/types.ts`)
- Verified `npm run lint` and `npm run build` both exit 0 with the new code

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isApiErrorBody guard and use it in both auth catch blocks** - `2d98e42` (fix)

**Plan metadata:** (recorded by orchestrator in a later docs commit)

## Files Created/Modified
- `apps/web/lib/api/types.ts` - Added exported `isApiErrorBody(value: unknown): value is ApiErrorBody` type guard directly below the existing `ApiErrorBody` interface
- `apps/web/app/(auth)/login/page.tsx` - Catch block rewritten to branch on `isApiErrorBody(err)` instead of an unchecked cast; unstructured errors now show an honest connection-error message; ACCOUNT_LOCKED special case preserved unchanged
- `apps/web/app/(auth)/register/page.tsx` - Catch block rewritten the same way; unstructured errors show the same honest connection-error message instead of "Registrasi gagal"

## Decisions Made
- Implemented `isApiErrorBody` defensively (object/null checks at every level) rather than assuming `value` is always an object, since a raw `fetch()` failure can throw a plain `TypeError`/`Error` with no `error` property at all
- Reused the identical connection-error message string on both login and register pages, since both are handling the same underlying failure mode (a network/connectivity exception, not a backend response) — no need for page-specific wording

## Deviations from Plan

### Auto-fixed Issues

**1. [Environment setup, not a deviation rule] Installed frontend dependencies before verification**
- **Found during:** Task 1 verification
- **Issue:** This worktree had no `apps/web/node_modules/` — `npm run lint` failed with `'eslint' is not recognized as an internal or external command`
- **Fix:** Ran `npm install --no-audit --no-fund` in `apps/web/` (package-lock.json confirmed byte-identical to main repo's copy modulo line endings, so no lockfile drift)
- **Files modified:** None tracked (`node_modules/` is gitignored; `package-lock.json` untouched)
- **Verification:** `npm run lint` and `npm run build` both ran successfully afterward
- **Committed in:** N/A (no file changes to commit — dependency install only)

---

**Total deviations:** 1 (environment setup only — no code bugs found, no scope creep)
**Impact on plan:** None on the implementation itself; the dependency install was a one-time prerequisite for running the plan's own verification commands in this worktree.

## Issues Encountered
None beyond the environment-setup item documented above under Deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The specific bug that caused this session's live-incident confusion (a dead `NEXT_PUBLIC_API_BASE_URL` rendering as "Email atau password salah") is fixed — any future raw network/connectivity failure on login or register now surfaces an honest, distinct message
- No other auth pages, `apiMutate`/`apiFetch`, or retry logic were touched
- No automated test framework exists yet for `apps/web` (confirmed via CLAUDE.md) — this fix was verified via lint, build, and grep only; a future testing-phase quick task could add a unit test for `isApiErrorBody` covering both a valid `{error:{code,message}}` shape and a raw `TypeError`

---
*Phase: quick-260704-ili*
*Completed: 2026-07-04*

## Self-Check: PASSED
- FOUND: apps/web/lib/api/types.ts
- FOUND: apps/web/app/(auth)/login/page.tsx
- FOUND: apps/web/app/(auth)/register/page.tsx
- FOUND: 2d98e42 (task commit)
