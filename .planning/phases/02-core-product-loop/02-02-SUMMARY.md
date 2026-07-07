# Plan 02-02 Summary — Goals list page + mock fixtures

**Executed:** 2026-07-05
**Status:** ✅ Complete

## Files Created

| File | Description |
|------|-------------|
| `apps/web/app/goals/page.tsx` | Goals list page — SAW-ranked cards, segmented strategy toggle, section-scoped empty state, persistent "+ Buat Goal" CTA |
| `apps/web/mocks/goal-detail.json` | Mock for `GET /api/goals/{id}` — extends `goal_001` with `allocation_history` array |
| `apps/web/mocks/goal-settings.json` | Mock for `GET /api/goal-settings` — default `quick_win` strategy with SAW weights |
| `apps/web/mocks/allocations-pending.json` | Mock for `GET /api/allocations/pending` — one pending allocation entry |

## Files Modified

| File | Change |
|------|--------|
| `apps/web/lib/api/client.ts` | Added 3 new `resolveMock()` branches (goal-detail regex before `/api/goals`, exact `/api/goal-settings`, exact `/api/allocations/pending`) + 3 new static imports |

## Acceptance Criteria Verification

- ✅ `client.ts` regex for `/api/goals/` placed **before** exact `/api/goals` match (non-shadowing)
- ✅ `client.ts` exact-match branches for `/api/goal-settings` and `/api/allocations/pending`
- ✅ All 3 mock JSON files exist; shapes match TypeScript interfaces in `types.ts`
- ✅ Goals page exported as `default function GoalsPage`
- ✅ Auth guard on mount: redirects to `/login` when `getToken()` returns null
- ✅ Segmented toggle triggers `apiMutate('PUT', /api/goal-settings)` → `apiFetch(GET /api/goals)` refetch
- ✅ Empty state with heading "Belum ada goal", body text, and single CTA "+ Buat Goal"
- ✅ Persistent "+ Buat Goal" CTA at bottom when goals exist

## Build Note

`npm run build` fails with a pre-existing native binary issue (`lightningcss.win32-x64-msvc.node` missing) — this is an environment/infrastructure issue affecting the entire project, not related to this plan's changes.

## Upstream Dependencies

No upstream dependencies — this plan is self-contained and unblocks `02-07` (goal detail page) and `02-08` (pending allocations page) by providing their mock fixtures in `client.ts`.