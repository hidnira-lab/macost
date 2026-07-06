---
phase: 02-core-product-loop
plan: 12
subsystem: api
tags: [fastapi, supabase, saw-ranking, smart-allocation, tdd]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: "goal_service.fetch_and_rank_goals() (02-10) - shared SAW-ranked goal list; wallets.py/goals.py IDOR + structured-error conventions (02-05/02-10)"
provides:
  - "backend/services/allocation_service.py - get_allocation_suggestion() (fixed 35% suggestion, top SAW-ranked goal + 2 alternatives)"
  - "GET /transactions/{id}/allocation-suggestion - independently re-validates Pemasukan+Flexible Side Income before computing"
  - "POST /allocations - sole write path into alokasi table (T-2-05 critical invariant), IDOR-safe on both transaksi_id and goal_id"
  - "POST /allocations/{id}/skip - zero-DB-write pending_until echo"
  - "GET /allocations/pending - implicit pending derivation via .in_() batch lookup, no 7th schema table"
affects: [02-13, 02-14, frontend Pending Suggestions / Smart Allocation modal work]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Implicit pending-state derivation (absence-of-alokasi-row) instead of a dedicated skipped_suggestion table", "Suggestion computation reuses goal_service.fetch_and_rank_goals() rather than duplicating SAW logic"]

key-files:
  created:
    - backend/models/allocation.py
    - backend/services/allocation_service.py
    - backend/routers/allocations.py
    - backend/tests/test_allocation_service.py
    - backend/tests/test_allocations.py
  modified: []

key-decisions:
  - "Pending state derived implicitly (RESEARCH.md Open Question #1 Option b, locked in PLAN.md) - no 7th migration table; skip is a pure read+compute echo, indistinguishable in storage from a never-touched transaction"
  - "GET /transactions/{id}/allocation-suggestion independently re-validates tipe_transaksi/source_label server-side (Open Question #3 guard) rather than trusting allocation_suggestion_available from transaction creation time"
  - "SUGGESTED_PCT fixed at 35 (Assumption A5), within the locked 29-40% ALLOC-02 range, not user-configurable in MVP"

patterns-established:
  - "Confirm-only mutation pattern: exactly one .insert( into a financially-sensitive table, gated behind an explicit user-triggered POST endpoint - verified via grep, not just tests"

requirements-completed: [ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04, ALLOC-05]

# Metrics
duration: 6min
completed: 2026-07-07
---

# Phase 02 Plan 12: Smart Allocation Backend (Suggestion, Confirm, Skip, Pending) Summary

**Allocation suggestion service (fixed 35% of top SAW-ranked goal) plus the 4 Allocations endpoints, with `POST /api/allocations` verified as the single write path into `alokasi` in the entire backend tree.**

## Performance

- **Duration:** ~6 min (dd6256a to fdca9cc)
- **Started:** 2026-07-06T23:01:03Z (UTC)
- **Completed:** 2026-07-06T23:06:40Z (UTC)
- **Tasks:** 2
- **Files modified:** 5 (all created)

## Accomplishments
- `allocation_service.get_allocation_suggestion()` computes `has_active_goal`, top-ranked goal, `suggested_amount = round(nominal * 0.35)`, and up to 2 `alternative_goals`, reusing `goal_service.fetch_and_rank_goals()` rather than duplicating SAW logic
- `GET /transactions/{id}/allocation-suggestion` independently re-validates the transaction is Pemasukan+Flexible Side Income before computing (never trusts the caller)
- `POST /allocations` confirmed as the sole `.insert(` into `alokasi` in the whole `backend/` tree (grep-verified, T-2-05 critical invariant) - IDOR-safe on both `transaksi_id` and `goal_id` (T-2-01), returns `goal_updated` re-fetched via the shared SAW-ranking entry point
- `POST /allocations/{id}/skip` performs zero database writes - pure read + compute of `pending_until`
- `GET /allocations/pending` derives pending state implicitly via `.in_("transaksi_id", ...)` batch lookup - no 7th schema table/column needed, covers both the never-touched case and the explicitly-skipped-but-unconfirmed case (identical in storage since skip writes nothing)

## Task Commits

Each task followed the RED (test) -> GREEN (feat) TDD cycle:

1. **Task 1: allocation_service.py + GET allocation-suggestion**
   - `dd6256a` (test): failing tests for suggestion computation (3 goals, 0 goals) + re-validation guard
   - `18caef4` (feat): implementation - all 3 tests green
2. **Task 2: POST confirm/skip + GET pending**
   - `51b8b1a` (test): failing tests for confirm/IDOR/skip/pending (4 cases)
   - `fdca9cc` (feat): implementation - all 4 tests green

_No refactor commit needed - implementation was clean on first pass._

## Files Created/Modified
- `backend/models/allocation.py` - `AllocationConfirmRequest` (`nominal_alokasi: int = Field(gt=0)`), `AllocationConfirmResponse`, `AllocationSkipResponse`, `AllocationPendingResponse`/`AllocationPending`
- `backend/services/allocation_service.py` - `SUGGESTED_PCT = 35`, `get_allocation_suggestion(transaction, user_id)`
- `backend/routers/allocations.py` - `GET /transactions/{id}/allocation-suggestion`, `POST /allocations`, `POST /allocations/{id}/skip`, `GET /allocations/pending`
- `backend/tests/test_allocation_service.py` - 3 tests (top-ranked suggestion + 35% amount, zero-goal case, non-side-income 400 guard)
- `backend/tests/test_allocations.py` - 4 tests (confirm inserts + goal_updated, cross-user IDOR 404, skip zero-writes, pending implicit derivation covering never-touched + explicitly-skipped-but-unconfirmed)

## Decisions Made
- Implicit pending-state derivation (no `skipped_suggestion` table) as explicitly locked in this plan's frontmatter/`key_links`, overriding RESEARCH.md's original recommendation of an explicit table (Option a) - the plan chose Option b to stay within the 6-migration schema scope already pushed
- `suggested_goal_name` in `AllocationPending` made `str | None` (not required `str` per the literal contract example) to handle the 0-active-goals edge case in `GET /allocations/pending` without crashing (Rule 2 robustness) - not explicitly tested by the plan's 3 named behaviors but consistent with `get_allocation_suggestion`'s own `has_active_goal=False` contract

## Deviations from Plan

None - plan executed exactly as written. Two test-authoring bugs were caught and fixed during the GREEN phase of TDD (not scope deviations):
- `test_allocation_service.py`: removed an unnecessary `monkeypatch.setattr(allocation_service, "get_supabase_admin", ...)` call - `allocation_service.py` never imports `get_supabase_admin` directly, it only reuses `goal_service.fetch_and_rank_goals()`
- `test_allocation_service.py`/initial IDOR test: corrected error-body assertions to `response.json()["detail"]["error"]["code"]` (FastAPI wraps `HTTPException.detail` under a `detail` key) and added a seeded `tanggal_transaksi` field required by `goal_service.get_avg_monthly_side_income()`

## Issues Encountered
- `pytest` (the bare executable) fails with `ModuleNotFoundError: No module named 'backend'` from the repo root because cwd isn't auto-added to `sys.path`; `python -m pytest` (which adds cwd to `sys.path`) works correctly. Documented here in case future executors hit the same thing running the plan's literal `<verify>` command.

## User Setup Required

None - no external service configuration required. All work is backend-only against the already-provisioned Supabase schema (6 migrations, no new tables added).

## Next Phase Readiness

- Smart Allocation backend (suggest -> confirm -> skip -> pending) is fully implemented, unit-tested, and verified against the T-2-05 critical invariant (exactly 1 `.insert(` into `alokasi`, gated behind explicit user confirmation)
- Not yet wired into `backend/main.py` - consistent with the existing pattern in this codebase, where `goals.router`/`transactions.router`/`categories.router`/`goal_settings.router` are also not yet registered in `main.py` (only `auth` and `wallets` are). Central wiring appears deferred to a later plan (dashboard_service references 02-14-PLAN.md) - flagging here so that plan doesn't miss registering `allocations.router` alongside the others
- Frontend Smart Allocation modal / Pending Suggestions page work can now build against these 4 endpoints per `API_CONTRACT.md` section 7

## Self-Check: PASSED

- FOUND: backend/models/allocation.py
- FOUND: backend/services/allocation_service.py
- FOUND: backend/routers/allocations.py
- FOUND: backend/tests/test_allocation_service.py
- FOUND: backend/tests/test_allocations.py
- FOUND commit: dd6256a
- FOUND commit: 18caef4
- FOUND commit: 51b8b1a
- FOUND commit: fdca9cc

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-07*
