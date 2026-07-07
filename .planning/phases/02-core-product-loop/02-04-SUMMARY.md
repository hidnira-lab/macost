---
phase: 02-core-product-loop
plan: 04
subsystem: api
tags: [saw-engine, python, pytest, tdd, ranking-algorithm]

# Dependency graph
requires:
  - phase: 02-01
    provides: pytest test infrastructure (backend/tests/conftest.py fixtures — sample_goals, sample_weights, fake_supabase_client)
provides:
  - "backend/services/saw_engine.py — pure rank_goals() SAW ranking engine with normalize_benefit/normalize_cost/compute_skor_kepentingan helpers"
  - "STRATEGY_MULTIPLIERS constant (TC-01 quick_win/importance_first re-weighting table)"
  - "27 passing unit tests covering SAW-01/02/03 edge cases"
affects: [02-10 (goal_service.py consumes rank_goals), 02-12 (allocation_service.py consumes rank_goals)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function service module: zero Supabase/IO dependency, all inputs pre-computed by caller (saving_capacity_raw, skor_kepentingan expected on goal dicts)"
    - "Strategy re-weighting via multiply-then-renormalize, computed internally, never mutating the stored/passed weights dict (TC-01)"

key-files:
  created:
    - backend/services/__init__.py
    - backend/services/saw_engine.py
    - backend/tests/test_saw_engine.py
  modified: []

key-decisions:
  - "rank_goals() expects skor_kepentingan and saving_capacity_raw already present on each goal dict — both are computed by the caller (goal_service.py) before calling rank_goals, matching TC-03's stated pattern (saving_capacity requires a DB query rank_goals itself cannot make) and Pitfall 6 (skor_kepentingan must be computed fresh on every read, not persisted, so the standalone compute_skor_kepentingan() helper stays a separate, directly-testable function rather than being called from inside rank_goals)"
  - "target_amount normalized via normalize_benefit (TC-04) — larger nominal_target scores higher, opposite of the original research proposal"
  - "Strategy toggle (TC-01) implemented as multiply STRATEGY_MULTIPLIERS[strategy] into weights then renormalize by the new sum — purely internal to rank_goals; the weights parameter and anything returned to callers is never touched"

requirements-completed: [SAW-01, SAW-02, SAW-03]

coverage:
  - id: D1
    description: "normalize_benefit/normalize_cost divide-by-zero guards (all-zero criterion, single zero-valued element)"
    requirement: "SAW-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestNormalizeBenefit, TestNormalizeCost"
        status: pass
    human_judgment: false
  - id: D2
    description: "compute_skor_kepentingan urgency bucket thresholds (<=30/90/180/365 days -> 5/4/3/2/1), overdue deadline -> max urgency"
    requirement: "SAW-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestComputeSkorKepentingan"
        status: pass
    human_judgment: false
  - id: D3
    description: "rank_goals 0/1/identical-goal edge case guards never raise; input goals list and weights dict are never mutated"
    requirement: "SAW-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestRankGoalsEdgeCases"
        status: pass
    human_judgment: false
  - id: D4
    description: "STRATEGY_MULTIPLIERS table matches TC-01 exactly for both quick_win and importance_first"
    requirement: "SAW-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestStrategyMultipliers"
        status: pass
    human_judgment: false
  - id: D5
    description: "rank_goals produces a known, assertable rank order for a 3-goal fixture under quick_win, a different known order under importance_first, and the two orders genuinely differ (top-ranked goal changes)"
    requirement: "SAW-01, SAW-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestRankGoalsKnownOrderAndStrategyToggle"
        status: pass
    human_judgment: false
  - id: D6
    description: "target_amount is normalized as a benefit criterion (larger nominal_target scores >= smaller, all else equal), not a cost criterion"
    requirement: "SAW-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_saw_engine.py::TestTargetAmountIsBenefit"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-06
status: complete
---

# Phase 2 Plan 04: SAW Ranking Engine Summary

**Pure `rank_goals()` SAW engine implementing TC-01 strategy re-weighting, TC-02 urgency buckets, and TC-04 benefit-direction `target_amount`, with 27 unit tests proving the 0/1/identical-goal edge cases (SAW-02's top ROADMAP risk) never crash.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-06T21:15:00Z
- **Completed:** 2026-07-06T21:40:40Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created services files, 1 test file)

## Accomplishments
- `normalize_benefit`/`normalize_cost` with explicit divide-by-zero guards (all-zero criterion, single zero-valued element) — the exact defense-in-depth mitigation the plan's threat model (T-2-04) requires
- `compute_skor_kepentingan(deadline, today)` implementing TC-02's exact bucket thresholds, UTC-based `today` default (Pitfall 8), overdue deadlines correctly bucketed as max urgency (5) rather than a negative/out-of-range score
- `rank_goals(goals, weights, strategy)` — the core deliverable: 0/1/identical-goal SAW-02 guards, TC-01 strategy re-weighting (multiply-then-renormalize, internal-only, never mutates the stored `weights`), TC-04 `target_amount`-as-benefit, `created_at`-ascending tie-break
- 27 passing unit tests, written RED-first for both tasks, proving every `<behavior>` case in the plan including a hand-verified known rank order for both `quick_win` and `importance_first` strategies on the same 3-goal fixture

## Task Commits

Each task was committed atomically, following the RED -> GREEN TDD sequence exactly as specified:

1. **Task 1: Pure normalization helpers + skor_kepentingan derivation**
   - `adf6d61` (test) — add failing tests for SAW normalization helpers
   - `a08e921` (feat) — implement SAW normalization + skor_kepentingan helpers
2. **Task 2: rank_goals() edge case guards + TC-01 strategy re-weighting + tie-break**
   - `9544a4d` (test) — add failing tests for rank_goals edge cases and strategy toggle
   - `5c36854` (feat) — implement rank_goals with TC-01 strategy re-weighting

No refactor commit was needed — implementation was clean on first GREEN pass for both tasks.

**Plan metadata:** committed separately (see final commit below).

## Files Created/Modified
- `backend/services/__init__.py` - empty package marker (matches `backend/routers`/`backend/dependencies` convention)
- `backend/services/saw_engine.py` - `normalize_benefit`, `normalize_cost`, `compute_skor_kepentingan`, `STRATEGY_MULTIPLIERS`, `rank_goals`
- `backend/tests/test_saw_engine.py` - 27 unit tests across 7 test classes covering SAW-01/02/03

## Decisions Made
- `rank_goals()` reads `saving_capacity_raw` and `skor_kepentingan` directly off each goal dict rather than computing them internally — both require data the pure function doesn't have access to (a DB query for `avg_monthly_side_income` per TC-03, and a `today` reference for `compute_skor_kepentingan`). This keeps `saw_engine.py` fully Supabase/IO-free per its own module docstring and the plan's threat model ("N/A — pure function" trust boundary), pushing that composition to `goal_service.py` (02-10-PLAN.md) as the plan's action step 4 already implies.
- Chose to assert full rank-order equality (not just top-1) in the known-order tests, computed by hand against the exact TC-01 multiplier table and TC-02/TC-04 formulas, to give the strongest possible regression signal for future changes to the SAW math.
- No refactor commit — implementation was straightforward enough that no cleanup pass was warranted after GREEN.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the RED -> GREEN sequence literally; no Rule 1-4 auto-fixes were needed since this is greenfield pure-function code with no pre-existing behavior to fix, and no architectural ambiguity arose (TC-01 through TC-04 fully specified the formulas).

## Issues Encountered

None. The project's `venv/` (repo root, Python 3.12, pytest 9.1.1) had pytest already installed and working — confirmed via a smoke run of the existing `backend/tests/test_smoke.py` before starting, so no environment setup was required.

## User Setup Required

None - no external service configuration required. This module has zero Supabase/network dependency by design.

## Next Phase Readiness
- `backend/services/saw_engine.py::rank_goals()` is ready to be consumed by `goal_service.py` (02-10-PLAN.md) and `allocation_service.py` (02-12-PLAN.md) per this plan's `key_links`
- Callers must supply `saving_capacity_raw` and `skor_kepentingan` on every goal dict before calling `rank_goals()` — this is a hard contract for 02-10/02-12 to honor, not optional
- No blockers for downstream plans in this phase

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-06*

## Self-Check: PASSED

- FOUND: backend/services/__init__.py
- FOUND: backend/services/saw_engine.py
- FOUND: backend/tests/test_saw_engine.py
- FOUND: .planning/phases/02-core-product-loop/02-04-SUMMARY.md
- FOUND commit: adf6d61 (test - normalization helpers RED)
- FOUND commit: a08e921 (feat - normalization helpers GREEN)
- FOUND commit: 9544a4d (test - rank_goals RED)
- FOUND commit: 5c36854 (feat - rank_goals GREEN)
- `pytest backend/tests/test_saw_engine.py -x`: 27 passed
- `pytest backend/tests/` (full suite): 28 passed
