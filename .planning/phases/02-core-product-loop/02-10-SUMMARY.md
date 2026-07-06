---
phase: 02-core-product-loop
plan: 10
subsystem: api
tags: [fastapi, pydantic, supabase, saw-engine, goals, goal-settings]

# Dependency graph
requires:
  - phase: 02-core-product-loop (02-01)
    provides: goal/alokasi/goal_settings schema + RLS
  - phase: 02-core-product-loop (02-04)
    provides: saw_engine.rank_goals()/compute_skor_kepentingan() pure functions
provides:
  - "GET/PUT /api/goal-settings — get-or-create default + weight-sum validation"
  - "Full Goals CRUD (POST/GET/GET-detail/PUT/DELETE) with real-time SAW ranking"
  - "goal_service.fetch_and_rank_goals() shared helper"
affects: [02-12-allocations, 02-14-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batched aggregation via .in_() for goal progress (Pattern 2), reused for saving_capacity input"
    - "Get-or-create-default row pattern (goal_settings), no 404 ever for a new user"
    - "Raw dict body param + manual Pydantic validation to control structured 400 vs FastAPI's default 422"

key-files:
  created:
    - backend/models/goal_settings.py
    - backend/services/goal_settings_service.py
    - backend/routers/goal_settings.py
    - backend/models/goal.py
    - backend/services/goal_service.py
    - backend/routers/goals.py
    - backend/tests/test_goal_settings.py
    - backend/tests/test_goals.py
  modified: []

key-decisions:
  - "Widened PUT /api/goal-settings weight-sum tolerance from the originally-proposed 0.001 to 0.002 — CLAUDE.md's locked default weights (22.5/21.9/21.5/17.8/16.2%) sum to a real, deterministic 0.999 (99.9%), not floating-point dust; a 0.001 tolerance would reject the exact default weights re-sent verbatim via the D-05 strategy-toggle flow, exactly the false-positive 02-RESEARCH.md's Pitfall 7 warns about."
  - "get_avg_monthly_side_income() fetches all matching transaksi rows with .eq() filters only and does date-range filtering (last 3 calendar months, fallback to all-time) in Python, rather than using .gte()/.lte() Supabase filters, to stay compatible with the existing FakeSupabaseClient test fixture (which only implements .eq()/.in_())."

patterns-established:
  - "Goal Settings get-or-create: select by id_pengguna, insert default row if empty, return either way — no 404 path"
  - "goal_service.fetch_and_rank_goals() as the single reusable entry point for anything needing ranked goals (allocations, dashboard)"

requirements-completed: [GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, SAW-01, SAW-02, SAW-03]

# Metrics
duration: 25min
completed: 2026-07-07
---

# Phase 02 Plan 10: Goal Settings + Goals CRUD with Real-Time SAW Ranking Summary

**GET/PUT /api/goal-settings (get-or-create-default, weight-sum validation) and full Goals CRUD wired to a shared `goal_service.fetch_and_rank_goals()` helper that calls the real `saw_engine.rank_goals()` via 4 batched Supabase queries (never N+1).**

## Performance

- **Duration:** 25 min
- **Tasks:** 2
- **Files modified:** 8 (all new)

## Accomplishments
- `GET/PUT /api/goal-settings` auto-creates a default row (`quick_win` + locked survey weights) on first read, never 404s, and validates weight sums with a structured `400 VALIDATION_ERROR` (not a bare FastAPI 422)
- Full Goals CRUD (`POST/GET/GET-detail/PUT/DELETE /api/goals`) with server-computed `nominal_terkumpul`/`progress_pct`/`skor_kepentingan`/`rank` — never client-writable
- `goal_service.fetch_and_rank_goals()` wires `saw_engine.rank_goals()` with exactly 4 batched Supabase queries total (goal, alokasi, transaksi-for-avg-income, goal_settings), regardless of goal count
- Goal deletion blocked with `400 GOAL_HAS_ALLOCATIONS` when allocation history exists, checked before any delete call

## Task Commits

Each task followed the RED → GREEN TDD cycle:

1. **Task 1: Goal Settings get-or-create + weight-sum validation**
   - `test(02-10)` — `3fd9b13` (RED: 4 failing tests)
   - `feat(02-10)` — `f20a883` (GREEN: model + service + router)
2. **Task 2: Goals CRUD with real-time SAW ranking**
   - `test(02-10)` — `1396d1f` (RED: 6 failing tests)
   - `feat(02-10)` — `65a47c1` (GREEN: model + service + router)

_No refactor commits needed — both GREEN implementations passed on first attempt with no follow-up cleanup required._

## Files Created/Modified
- `backend/models/goal_settings.py` - `GoalSettingsWeights`, `GoalSettingsUpdate` (weight-sum `field_validator`), `GoalSettingsResponse`
- `backend/services/goal_settings_service.py` - `DEFAULT_WEIGHTS` constant, `get_or_create_goal_settings()`
- `backend/routers/goal_settings.py` - `GET/PUT /api/goal-settings`
- `backend/models/goal.py` - `GoalCreate`/`GoalUpdate` (deadline-must-be-future `field_validator`), `GoalResponse`, `GoalDetailResponse`
- `backend/services/goal_service.py` - `fetch_and_rank_goals()`, `get_avg_monthly_side_income()`
- `backend/routers/goals.py` - `POST/GET/GET-detail/PUT/DELETE /api/goals`
- `backend/tests/test_goal_settings.py` - 4 behavior-case tests
- `backend/tests/test_goals.py` - 6 behavior-case tests (including a query-count assertion via a `_CountingSupabaseClient` wrapper, matching `test_wallets.py`'s convention)

## Decisions Made
- Widened the `PUT /api/goal-settings` weight-sum tolerance from 0.001 to 0.002. CLAUDE.md's locked default weights literally sum to 0.999 (a real 0.1% rounding artifact from the underlying n=62 survey percentages, not floating-point representation noise — `0.225+0.219+0.215+0.178+0.162 == 0.999` exactly in Python). A strict `< 0.001` tolerance would reject the exact default weights being re-sent unchanged (e.g. via the D-05 strategy-toggle flow, which resends the same weights with only `strategy` changed) — this is precisely the false-positive 02-RESEARCH.md's own Pitfall 7 "Warning signs" section calls out. 0.002 still rejects materially wrong weight sets (tested: 0.95) while accepting the known 0.999 default sum. This is a Rule 1 (auto-fix bug) deviation, documented below.
- `get_avg_monthly_side_income()` fetches candidate rows with `.eq()` filters only (id_pengguna, tipe_transaksi, source_label) and does the "last 3 calendar months, else all-time, else 0.0" logic in Python, rather than chaining `.gte()/.lte()` on the Supabase query builder — keeps it compatible with the existing `FakeSupabaseClient` test fixture (`backend/tests/conftest.py`), which only implements `.eq()`/`.in_()`, and data volume per user is small enough that this has no real performance cost.
- `GoalUpdate` is defined as a subclass of `GoalCreate` (identical fields + inherited deadline-future validator) rather than a separate duplicate class, per the plan's "same shape" instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Widened weight-sum validation tolerance from 0.001 to 0.002**
- **Found during:** Task 1, while running the GREEN implementation against the RED test for "PUT with weights summing to exactly 1.0... succeeds"
- **Issue:** The plan's literal `abs(sum - 1.0) >= 0.001` tolerance rejected the exact CLAUDE.md-locked default weights (`0.225+0.219+0.215+0.178+0.162`), which sum to a real, deterministic `0.999` in Python (not floating-point dust) — a 0.1%-rounding artifact of the underlying survey percentages (`22.5+21.9+21.5+17.8+16.2 = 99.9`). This is exactly the false-positive scenario 02-RESEARCH.md's Pitfall 7 flags as a warning sign ("Intermittent 400 VALIDATION_ERROR on a PUT that sends back the exact default weights unchanged").
- **Fix:** Widened the tolerance to 0.002 in `backend/models/goal_settings.py`'s `field_validator`, with an inline comment explaining why. Verified 0.95 (a materially wrong sum) is still correctly rejected, and the default weights now pass.
- **Files modified:** `backend/models/goal_settings.py`
- **Verification:** `pytest backend/tests/test_goal_settings.py` — all 4 cases pass, including both the rejection case (0.95) and the exact-default-weights success case
- **Committed in:** `f20a883` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Necessary correctness fix — without it, the D-05 strategy-toggle flow (re-sending unchanged default weights with only `strategy` changed) would spuriously 400 for every user on the default weights, a demo-breaking bug. No scope creep; the fix is a single constant + comment change.

## Issues Encountered
None beyond the weight-sum tolerance deviation documented above. Both tasks' GREEN implementations passed on the first full test run after the fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `goal_service.fetch_and_rank_goals()` and `goal_settings_service.get_or_create_goal_settings()` are ready to be reused directly by `02-12` (Allocations — needs the ranked goals list + top-ranked goal for suggestions) and `02-14` (Dashboard — needs goal progress for KPIs), per this plan's `key_links`. Do not duplicate this logic in either of those plans.
- `backend/main.py` still does not wire up `goals.router`/`goal_settings.router` (consistent with `transactions.py`/`categories.py`, also not yet wired) — central router registration is deferred to a later integration plan per existing convention in this phase, not part of this plan's scope.
- All 51 backend tests pass (`pytest backend/tests/ -q`).

## Self-Check: PASSED

- All 8 created files found on disk (models, services, routers, tests)
- All 4 commit hashes (`3fd9b13`, `f20a883`, `1396d1f`, `65a47c1`) found in git log
- `pytest backend/tests/test_goal_settings.py backend/tests/test_goals.py -x` and full `pytest backend/tests/ -q` both pass (51 tests)

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-07*
