---
phase: 04-polish
plan: 01
subsystem: api
tags: [idempotency, fastapi, supabase, postgres, offline-sync, pytest]

# Dependency graph
requires:
  - phase: 03-differentiators
    provides: All Phase 2/3 backend routers (transactions, goals, allocations) and their existing IDOR-safe double-.eq() query pattern, which this plan extends rather than replaces
provides:
  - Migration 008 (idempotency_key column + partial UNIQUE index on transaksi/goal/alokasi), live on Supabase
  - check_idempotency() shared service helper
  - Idempotency-aware POST/PUT handlers on all 5 offline-queueable write endpoints
affects: [04-02 (pixel art, unaffected), 04-03 (frontend offline queue -- this plan is its backend prerequisite)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check_idempotency(supabase, table, current_user_id, idempotency_key) shared helper, mirrors existing double-.eq() IDOR-safe scoping"
    - "Retry-hit re-fetch via fetch_and_rank_goals() (goals/allocations) instead of returning the raw row, so rank/progress_pct/nominal_terkumpul stay consistent"
    - "Partial UNIQUE index (WHERE idempotency_key IS NOT NULL) — column stays nullable, existing/online writes unaffected"

key-files:
  created:
    - backend/migrations/008_add_idempotency_keys.sql
    - backend/services/idempotency.py
    - backend/tests/test_idempotency_service.py
  modified:
    - backend/models/transaction.py
    - backend/models/goal.py
    - backend/models/allocation.py
    - backend/routers/transactions.py
    - backend/routers/goals.py
    - backend/routers/allocations.py
    - backend/tests/test_transactions.py
    - backend/tests/test_goals.py
    - backend/tests/test_allocations.py
    - API_CONTRACT.md

key-decisions:
  - "Idempotency guard in confirm_allocation placed AFTER transaction/goal-ownership lookups (so a retry with a since-deleted ref still 404s) but BEFORE the already-allocated check (so a retry of your own confirmed allocation is never rejected as a double-allocation)"
  - "Retry hits on goals/allocations re-fetch via fetch_and_rank_goals() rather than returning the raw DB row directly -- the raw row lacks the computed rank/progress_pct/nominal_terkumpul fields the response shape requires"
  - "idempotency_key typed as plain str | None (not Pydantic UUID4) for MVP timeline -- a malformed value simply never matches, no crash path (T-4-04, accepted risk)"

patterns-established:
  - "Shared idempotency helper built once (backend/services/idempotency.py) rather than copy-pasted 3x across routers, avoiding drift"

requirements-completed: [OFF-01]

coverage:
  - id: D1
    description: "check_idempotency() helper returns None for no-key/no-match/cross-user cases and the exact matching row when key+user both match"
    requirement: "OFF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_idempotency_service.py#test_no_idempotency_key_returns_none_and_never_queries"
        status: pass
      - kind: unit
        ref: "backend/tests/test_idempotency_service.py#test_key_supplied_but_no_matching_row_returns_none"
        status: pass
      - kind: unit
        ref: "backend/tests/test_idempotency_service.py#test_matching_row_for_same_user_and_key_is_returned"
        status: pass
      - kind: unit
        ref: "backend/tests/test_idempotency_service.py#test_same_key_for_different_user_never_collides"
        status: pass
    human_judgment: false
  - id: D2
    description: "Retried POST /api/transactions with the same idempotency_key never creates a second row and is scoped per-user"
    requirement: "OFF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_transactions.py#test_post_transaction_with_idempotency_key_creates_once"
        status: pass
      - kind: unit
        ref: "backend/tests/test_transactions.py#test_post_transaction_retried_idempotency_key_returns_original_no_duplicate"
        status: pass
      - kind: unit
        ref: "backend/tests/test_transactions.py#test_post_transaction_idempotency_key_scoped_per_user_no_cross_user_collision"
        status: pass
    human_judgment: false
  - id: D3
    description: "Retried POST /api/goals and PUT /api/goals/{id} never create/duplicate a row"
    requirement: "OFF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_goals.py#test_post_goal_retried_idempotency_key_returns_original_no_duplicate"
        status: pass
      - kind: unit
        ref: "backend/tests/test_goals.py#test_put_goal_retried_idempotency_key_returns_original_no_duplicate_update"
        status: pass
    human_judgment: false
  - id: D4
    description: "Retried POST /api/allocations (money-moving path) never double-allocates or double-counts nominal_terkumpul"
    requirement: "OFF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_allocations.py#test_post_allocations_retried_idempotency_key_returns_original_no_double_allocation"
        status: pass
    human_judgment: false
  - id: D5
    description: "Migration 008 applied to live Supabase -- idempotency_key + partial unique indexes exist on transaksi/goal/alokasi"
    requirement: "OFF-01"
    verification: []
    human_judgment: true
    rationale: "Live Supabase Dashboard SQL Editor action with no CLI/API path in this project -- Hidayat manually ran the migration and confirmed success via Table Editor per the Task 0 checkpoint; not independently re-verifiable from this worktree"

duration: 35min
completed: 2026-07-10
status: complete
---

# Phase 4 Plan 01: Backend Idempotency Foundation Summary

**Shared `check_idempotency()` helper + idempotency-aware POST/PUT handlers across transactions, goals, and allocations routers, backed by a live migration 008 (partial UNIQUE index on transaksi/goal/alokasi) — retried offline-queue writes never duplicate financial records.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-10T (Task 0 checkpoint) — resumed after human-action confirmation
- **Completed:** 2026-07-10
- **Tasks:** 3 (Task 0 checkpoint + Task 1 + Task 2)
- **Files modified:** 13 (3 created, 10 modified)

## Accomplishments
- Migration 008 (`backend/migrations/008_add_idempotency_keys.sql`) written, committed, and run successfully against live Supabase by Hidayat via Dashboard SQL Editor — nullable `idempotency_key UUID` column + partial UNIQUE index `(id_pengguna, idempotency_key) WHERE idempotency_key IS NOT NULL` on all 3 tables
- `check_idempotency()` shared service helper (`backend/services/idempotency.py`), unit-tested in isolation for the no-key/no-match/matching-row/cross-user-isolation cases
- All 5 offline-queueable write endpoints (create_transaction, create_goal, update_goal, confirm_allocation) are idempotency-aware — a retried request with the same key+user returns the original result instead of inserting/updating again
- `POST /api/allocations` (the critical money-moving path) never double-allocates or double-counts `nominal_terkumpul` on retry
- API_CONTRACT.md documents the new optional `idempotency_key` field on all 4 affected endpoint sections
- Zero regressions: full backend suite went from 123 pre-existing tests (per STATE.md) to 133 passing (10 new idempotency tests added), all green

## Task Commits

Each task was committed atomically:

1. **Task 0: Write and apply migration 008 to live Supabase [BLOCKING checkpoint]** - `f319ba9` (feat) — migration file written and committed; Hidayat then ran it against live Supabase via Dashboard SQL Editor and confirmed success (checkpoint resolved via coordinator relay)
2. **Task 1: Shared check_idempotency() helper + Pydantic model fields** - `8079ae4` (feat)
3. **Task 2: Wire idempotency checks into transactions, goals, and allocations routers** - `971ba83` (feat)

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified
- `backend/migrations/008_add_idempotency_keys.sql` - Nullable idempotency_key UUID column + partial UNIQUE index on transaksi/goal/alokasi
- `backend/services/idempotency.py` - Shared check_idempotency() helper, double-.eq() IDOR-safe scoping
- `backend/tests/test_idempotency_service.py` - 4 unit tests for the helper in isolation
- `backend/models/transaction.py` - Added `idempotency_key: str | None = None` to TransactionCreate
- `backend/models/goal.py` - Added `idempotency_key: str | None = None` to GoalCreate (inherited by GoalUpdate)
- `backend/models/allocation.py` - Added `idempotency_key: str | None = None` to AllocationConfirmRequest
- `backend/routers/transactions.py` - create_transaction checks idempotency before insert, adds key to insert_payload
- `backend/routers/goals.py` - create_goal/update_goal check idempotency before insert/update, re-fetch via fetch_and_rank_goals on hit
- `backend/routers/allocations.py` - confirm_allocation checks idempotency after ownership lookups but before already-allocated check
- `backend/tests/test_transactions.py` - 3 new tests: create-once, retry-returns-original, cross-user isolation
- `backend/tests/test_goals.py` - 2 new tests: POST and PUT retry-returns-original
- `backend/tests/test_allocations.py` - 1 new test: retry never double-allocates/double-counts
- `API_CONTRACT.md` - Documents optional idempotency_key field on the 4 affected endpoints

## Decisions Made
- Idempotency guard in `confirm_allocation` placed AFTER transaction/goal-ownership lookups (a retry whose referenced transaction/goal was since deleted still correctly 404s) but BEFORE the already-allocated check (a retry of your own already-processed request is not a double-allocation — it's the same one echoed back, and must not trigger `_already_allocated()`)
- Retry hits on goals/allocations re-fetch via `fetch_and_rank_goals()` rather than returning the raw DB row directly, since the raw row lacks the computed `rank`/`progress_pct`/`nominal_terkumpul` fields the response shape requires
- `idempotency_key` typed as plain `str | None` (not Pydantic `UUID4`) per the plan's explicit accepted-risk framing (T-4-04) — a malformed value simply never matches an existing row and falls through to a normal insert, no crash path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Task 0's blocking checkpoint (live Supabase Dashboard action) was resolved via the coordinator relaying Hidayat's confirmation mid-session, exactly per the plan's `<plan_note>` protocol — no re-verification was possible from this worktree, but the confirmation was explicit and unambiguous (migration ran, all 3 tables + indexes confirmed via Table Editor).

## User Setup Required

None beyond the Task 0 checkpoint already completed by Hidayat (migration 008 run against live Supabase). No new env vars — this plan is entirely additive schema + backend code.

## Next Phase Readiness

- Backend idempotency foundation is complete and live — 04-03 (frontend offline queue) can now safely send `idempotency_key` on any offline-originated write to `POST /api/transactions`, `POST /api/goals`, `PUT /api/goals/{id}`, and `POST /api/allocations` without risk of duplicate financial records on a retried sync
- Full backend suite (133 tests) green; no regressions in any pre-existing test
- 04-02 (pixel art) is unaffected by this plan — fully independent frontend-only work per D-09's work-order decision

---
*Phase: 04-polish*
*Completed: 2026-07-10*
