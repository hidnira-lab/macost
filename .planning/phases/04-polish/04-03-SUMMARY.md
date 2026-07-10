---
phase: 04-polish
plan: 03
subsystem: web
tags: [offline, idb, indexeddb, sync, idempotency, frontend]

# Dependency graph
requires:
  - phase: 04-polish (04-01)
    provides: Backend idempotency_key support on POST /api/transactions, POST/PUT /api/goals, POST /api/allocations — this plan's queue.ts replayItem() depends on that field existing server-side
provides:
  - lib/offline/{types,db,queue}.ts — IndexedDB-backed offline write queue (enqueue/sync)
  - components/SyncStatusIndicator.tsx + components/OfflineSyncProvider.tsx — global OFF-02 status UI + online/offline wiring
  - Offline-queue fallback wired into transaction create, goal create/edit, allocation confirm/skip
affects: [04-02 (pixel art, unaffected — independent frontend surface)]

# Tech tracking
tech-stack:
  added: ["idb 8.0.3"]
  patterns:
    - "Single unified IndexedDB 'queue' object store with a kind discriminator (QueuedItem union), not 3 separate stores"
    - "Sequential (for...of + await) sync replay — never Promise.all — to preserve goal-before-allocation ordering"
    - "CustomEvent bridge (macost:sync-status, macost:allocation-suggestion) from OfflineSyncProvider to SyncStatusIndicator / transactions/new page, avoiding a new shared-state library"
    - "isApiErrorBody() guard distinguishes a structured API error from a raw network-level failure (TypeError/plain Error) to decide whether to fall back to the offline queue"

key-files:
  created:
    - apps/web/lib/offline/types.ts
    - apps/web/lib/offline/db.ts
    - apps/web/lib/offline/queue.ts
    - apps/web/components/SyncStatusIndicator.tsx
    - apps/web/components/OfflineSyncProvider.tsx
  modified:
    - apps/web/package.json
    - apps/web/package-lock.json
    - apps/web/lib/api/types.ts
    - apps/web/app/layout.tsx
    - apps/web/app/transactions/new/page.tsx
    - apps/web/app/goals/new/page.tsx
    - apps/web/components/AllocationSuggestionModal.tsx

key-decisions:
  - "NewQueuedItem redefined as a union of per-variant 'new' shapes (not Omit<QueuedItem, 'id'|'createdAt'|'attempts'>) — Omit over a discriminated union collapses to only the fields common to all variants, which silently dropped payload/goalId/transactionId from the type; the union-of-variants form preserves per-kind field typing at all 3 call sites"
  - "Deferred allocation-suggestion handoff (D-02) implemented via a window CustomEvent ('macost:allocation-suggestion') dispatched from OfflineSyncProvider/sync(), not a shared state library — transactions/new/page.tsx listens and opens the existing SmartAllocationModal exactly as the online path already does"
  - "isApiErrorBody() (already exported from lib/api/types.ts for the login/register error-handling fix) reused as the offline-fallback trigger for network-level failures at all 3 write call sites, instead of introducing a new heuristic"

patterns-established:
  - "Offline-fallback guard shape repeated inline at 3 call sites (navigator.onLine check + isApiErrorBody catch-branch) rather than extracted into a shared helper — plan explicitly scoped this as acceptable given the ~1 line per site and tight timeline"

requirements-completed: [OFF-01, OFF-02]

coverage:
  - id: T1
    description: "IndexedDB offline queue module (enqueue/sync) implements sequential replay, idempotency-key injection, and deferred allocation-suggestion fetch"
    requirement: "OFF-01"
    verification:
      - kind: command
        ref: "cd apps/web && npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Per 04-RESEARCH.md/D-11, this project has no frontend test framework and none is being introduced this phase — enqueue/sync/replayItem's sequential-order, idempotency-key, and deferred-suggestion behaviors are validated via manual code-level review + tsc, not an automated assertion. Verifier should manually trace queue.ts's for...of loop and the D-02 guard before sign-off."
  - id: T2
    description: "SyncStatusIndicator renders nothing in the default synced+empty-queue case and shows offline/syncing/synced correctly otherwise; online/offline listeners registered once globally; static export build stays clean"
    requirement: "OFF-02"
    verification:
      - kind: command
        ref: "cd apps/web && npx tsc --noEmit && npm run build"
        status: pass
    human_judgment: true
    rationale: "Visual/behavioral correctness (bar appearance timing, 2s auto-hide, color/copy per state) requires manual UAT in browser + Tauri desktop per 04-VALIDATION.md D-11 — automated checks here only prove it type-checks and doesn't break the build, not that it looks/behaves correctly on screen."
  - id: T3
    description: "All 3 broadened-scope write paths (transaction, goal, allocation) fall back to enqueue() when offline or on network failure, without ever showing the allocation-suggestion modal at enqueue time; online paths unchanged"
    requirement: "OFF-01"
    verification:
      - kind: command
        ref: "cd apps/web && npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "The full offline->queue->reconnect->sync->deferred-modal user journey (04-VALIDATION.md verification steps 1-3) requires manual UAT with real network toggling in both browser and Tauri desktop — cannot be proven by a type-check alone."
duration: 45min
completed: 2026-07-10
status: complete
---

# Phase 4 Plan 03: Offline Write Queue + Sync Status Indicator Summary

**IndexedDB-backed offline write queue (`idb` 8.0.3) with sequential auto-sync on reconnect, an ambient offline/syncing/synced status bar, and enqueue-on-failure wiring across transaction, goal, and allocation write paths — with the Smart Allocation suggestion modal always deferred until after a queued transaction actually syncs (D-02).**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-07-10
- **Tasks:** 3 (all `type="auto"`, Task 1 `tdd="true"` per manual-review-only D-11 scoping)
- **Files:** 5 created, 7 modified

## Accomplishments

- `apps/web/lib/offline/{types,db,queue}.ts` — a single `idb`-backed IndexedDB `queue` object store (keyed on client UUID, `by-createdAt` index) holding a `QueuedItem` discriminated union across all 5 offline-queueable actions (`transaction`, `goal_create`, `goal_update`, `allocation_confirm`, `allocation_skip`); `sync()` drains it strictly sequentially via `for...of` + `await` (never `Promise.all`), reusing `apiMutate`/`apiFetch` unchanged and injecting each item's own UUID as `idempotency_key` (04-01's backend guarantee) — a failing item increments its `attempts` counter and stays queued without blocking the rest.
- `apps/web/components/SyncStatusIndicator.tsx` (OFF-02) — a slim full-width bar mounted directly above `BottomNav`, absent entirely in the default synced+online+empty-queue case, showing "Offline" / "Menyinkronkan..." / "Tersinkron" per 04-UI-SPEC.md's exact copy/color/icon contract, auto-hiding 2s after a synced transition.
- `apps/web/components/OfflineSyncProvider.tsx` — the root layout's first non-scaffold client addition: registers the `window 'online'` listener exactly once (inside `useEffect`, never at module scope) to trigger `sync()`, and bridges status/allocation-suggestion updates to any mounted page via `CustomEvent`s (`macost:sync-status`, `macost:allocation-suggestion`).
- All 3 broadened-scope (D-01) write paths — `transactions/new/page.tsx` (transaction create), `goals/new/page.tsx` (goal create/edit), `AllocationSuggestionModal.tsx` (confirm/skip) — now fall back to `enqueue()` when offline (`navigator.onLine === false`) or on a network-level failure (distinguished from a real structured API error via the existing `isApiErrorBody()` guard), never showing the allocation-suggestion modal at enqueue time (D-02 preserved end-to-end).
- `next.config.ts`'s static export build (`npm run build`) and `npx tsc --noEmit` both pass cleanly after every task.

## Task Commits

Each task was committed atomically:

1. **Task 1: IndexedDB offline queue module (db.ts, types.ts, queue.ts)** - `a779c6b` (feat) — installed `idb`, added `lib/offline/{types,db,queue}.ts`, added optional `idempotency_key` field to `TransactionCreateRequest`/`GoalCreateRequest`/`AllocationConfirmRequest` in `lib/api/types.ts` so `queue.ts`'s request-body spread type-checks.
2. **Task 2: SyncStatusIndicator + global mount + online/offline wiring** - `4e5ac6f` (feat) — added `SyncStatusIndicator.tsx`, `OfflineSyncProvider.tsx`, mounted the provider in `app/layout.tsx`, updated the scaffold's placeholder metadata title to "Macost".
3. **Task 3: Wire enqueue-on-offline-or-failure into transaction, goal, and allocation write paths** - `85bf6a6` (feat) — updated `transactions/new/page.tsx`, `goals/new/page.tsx`, `AllocationSuggestionModal.tsx`; also fixed `NewQueuedItem`'s type definition (discovered during this task — see Deviations).

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified

- `apps/web/lib/offline/types.ts` - `QueuedItem` discriminated union (5 variants) + `NewQueuedItem`/`SyncStatus` types
- `apps/web/lib/offline/db.ts` - Lazy-singleton `getDB()` opening the `macost-offline` IndexedDB database
- `apps/web/lib/offline/queue.ts` - `enqueue()`, `sync()`, `getQueueCount()`, internal `replayItem()` dispatch
- `apps/web/components/SyncStatusIndicator.tsx` - OFF-02 ambient status bar
- `apps/web/components/OfflineSyncProvider.tsx` - Global `online`/`offline` listener + CustomEvent bridge, mounted in layout
- `apps/web/package.json` / `package-lock.json` - Added `idb` 8.0.3 dependency
- `apps/web/lib/api/types.ts` - Added optional `idempotency_key` field to 3 request interfaces
- `apps/web/app/layout.tsx` - Mounted `OfflineSyncProvider`, fixed placeholder metadata title
- `apps/web/app/transactions/new/page.tsx` - `handleSave()` offline/network-failure fallback + deferred-suggestion event listener
- `apps/web/app/goals/new/page.tsx` - Submit handler offline/network-failure fallback (create + edit branches)
- `apps/web/components/AllocationSuggestionModal.tsx` - `handleConfirm()`/`handleSkip()` offline/network-failure fallback

## Decisions Made

- `NewQueuedItem` redefined as a union of per-variant "new" shapes rather than `Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'>` — `Omit` applied to a discriminated union collapses to only the properties common across all members, silently erasing `payload`/`goalId`/`transactionId` from the resulting type. Found via `tsc` failures at all 3 Task 3 call sites; fixed by defining each variant's "new" shape separately (`NewTransactionItem`, `NewGoalCreateItem`, etc.) and unioning them, which distributes correctly.
- Deferred allocation-suggestion handoff (D-02) implemented via a `window` `CustomEvent` (`macost:allocation-suggestion`) rather than prop-drilling or a new shared-state library — `OfflineSyncProvider` dispatches it from inside `sync()`'s success callback, and `transactions/new/page.tsx` listens for it to open the existing `SmartAllocationModal` with the resolved suggestion, exactly mirroring the online path's trigger.
- Reused the existing `isApiErrorBody()` guard (already exported from `lib/api/types.ts`, originally added for the login/register connectivity-error fix) as the signal for "this failure is network-level, fall back to the offline queue" at all 3 write call sites, rather than inventing a new heuristic.

## Deviations from Plan

**[Rule 1 - Bug found during implementation] `NewQueuedItem` type definition dropped variant-specific fields**
- Found during: Task 3 (wiring the 3 call sites)
- Issue: The plan's/RESEARCH.md's illustrative `Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'>` pattern, when applied to `QueuedItem`'s discriminated union, produced a type with only the properties shared by every variant — `tsc` rejected `payload`, `goalId`, and `transactionId` as "not existing" at all 3 call sites (10 errors total across `goals/new/page.tsx`, `transactions/new/page.tsx`, `AllocationSuggestionModal.tsx`).
- Fix: Redefined `NewQueuedItem` in `lib/offline/types.ts` as an explicit union of 5 per-variant "new" shapes (`NewTransactionItem | NewGoalCreateItem | NewGoalUpdateItem | NewAllocationConfirmItem | NewAllocationSkipItem`), each also reused to build the corresponding `QueuedItem` variant via `QueuedItemBase & NewXItem`. This distributes correctly over the union.
- Files modified: `apps/web/lib/offline/types.ts`
- Verification: `npx tsc --noEmit` clean (0 errors) after the fix; re-ran at all 3 call sites.
- Commit: `85bf6a6` (bundled with the Task 3 commit since it was discovered while executing that task, before any commit was made)

**Total deviations:** 1 auto-fixed (Rule 1 - type-system bug, caught by the task's own `tsc --noEmit` verification gate before commit). **Impact:** none — caught and fixed before any commit; final state type-checks and builds cleanly across all 3 tasks.

## Issues Encountered

None blocking. `npm run lint` surfaced one pre-existing error in `components/SmartAllocationModal.tsx` (a `react-hooks/set-state-in-effect` violation) and several pre-existing unused-variable warnings across untouched files — confirmed via `git log` that `SmartAllocationModal.tsx` was last touched in Phase 2 (commit `418c830`), well before this plan, and is not in this plan's file list. Lint on the files this plan actually created/modified (`npx eslint <11 files>`) returned 0 errors, 2 pre-existing warnings unrelated to the changes made here.

## User Setup Required

None. No new environment variables — IndexedDB is entirely client-side, and the `idempotency_key` field this plan sends was already made backend-ready by 04-01 (already live on Supabase per that plan's Task 0 checkpoint).

## Next Phase Readiness

- OFF-01 and OFF-02 are both structurally complete: offline queue module, global sync-status indicator, and all 3 write-path fallbacks are wired and type-check/build cleanly.
- **Manual UAT still required** before this can be considered fully verified (per 04-RESEARCH.md D-11 — frontend behaviors here have no automated test coverage by design): (1) disable network, add a transaction, confirm local acceptance with no suggestion modal, re-enable network, confirm sync + deferred modal; (2) offline goal-create then allocation-confirm/skip referencing it, confirm both sync in correct order with no 404; (3) watch the sync indicator through a full offline→queued→online→syncing→synced cycle in both browser and Tauri desktop. These 3 checks are listed verbatim in the plan's `<verification>` block and were not run by this executor (no live network-toggle/Tauri desktop environment available in this worktree).
- 04-02 (pixel art) is unaffected — its `GoalPixelArt.tsx` component (confirmed present on disk, already merged from Wave 1) is fully independent of this plan's offline work.
- This completes both of Phase 4's OFF-01/OFF-02 requirements per REQUIREMENTS.md; combined with 04-01 (backend idempotency) and 04-02 (pixel art), Phase 4's full scope (VIS-01, OFF-01, OFF-02) is now code-complete pending the manual UAT pass above.

## Self-Check: PASSED

- `apps/web/lib/offline/{db,types,queue}.ts` confirmed on disk via `[ -f ]`
- `apps/web/components/SyncStatusIndicator.tsx` confirmed on disk via `[ -f ]`
- `git log --oneline --all --grep="04-03"` returns 3 commits (`a779c6b`, `4e5ac6f`, `85bf6a6`)
- All 3 tasks' `<acceptance_criteria>`/`<verify>` commands (`npx tsc --noEmit`, `npm run build`) re-run at the end of this session — both pass
- Plan-level `<success_criteria>` re-checked: idb installed ✓, lib/offline module implements the researched patterns ✓, SyncStatusIndicator mounted globally with correct absent/visible states per code review ✓, all 3 write paths fall back to the queue ✓, allocation-suggestion modal never fetched/shown at enqueue time (verified by reading `queue.ts`'s `sync()` — the fetch is inside the per-item success branch only) ✓, static export build clean ✓, `tsc --noEmit` clean ✓

---
*Phase: 04-polish*
*Completed: 2026-07-10*
