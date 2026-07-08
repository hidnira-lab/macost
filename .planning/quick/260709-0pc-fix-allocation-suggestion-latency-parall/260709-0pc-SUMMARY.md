---
task: Fix allocation-suggestion latency by parallelizing independent Supabase queries
slug: fix-allocation-suggestion-latency-parall
status: complete
commit: d53b417
completed: 2026-07-09
---

# Quick Task 260709-0pc: Fix allocation-suggestion latency Summary

**Parallelized the two independent Supabase queries inside `goal_service.fetch_and_rank_goals()` using a `ThreadPoolExecutor` — cuts one sequential round-trip's worth of latency from the `GET /api/transactions/{id}/allocation-suggestion` critical path.**

## Trigger

During plan `02-15` (Phase 2 integration verification), a live latency measurement against `https://macost-production.up.railway.app` found `GET /api/transactions/{id}/allocation-suggestion` averaging **2622ms** (3 runs: 2470ms, 2440ms, 2956ms) against the ROADMAP.md ≤2000ms success criterion — a FAIL. Root-cause investigation (reading `backend/services/allocation_service.py` and `backend/services/goal_service.py`) found no N+1 bug, but 5 Supabase REST queries executing fully sequentially in the request path, 2 of which (`get_avg_monthly_side_income`, `get_or_create_goal_settings`) have no data dependency on the others.

## Accomplishments

- `backend/services/goal_service.py`'s `fetch_and_rank_goals()`: the goals fetch → alokasi fetch (dependent pair, unchanged) now runs, followed by `get_avg_monthly_side_income(user_id)` and `get_or_create_goal_settings(user_id)` executing **concurrently** via `ThreadPoolExecutor(max_workers=2)` instead of sequentially.
- No change to response shape (API_CONTRACT.md §7 untouched), SAW ranking logic, or IDOR validation order in `backend/routers/allocations.py` — scope held exactly to the plan.
- Error propagation preserved: `.result()` re-raises any exception from either worker in the main thread, matching prior sequential behavior.

## Files Created/Modified

- `backend/services/goal_service.py` — added `ThreadPoolExecutor` import; replaced 2 sequential calls with a 2-worker thread pool submit/result pair.

## Test Results

- Targeted: `python -m pytest backend/tests/ -k "goal or allocation" -v` → **28 passed**, 0 failed
- Full suite: `python -m pytest backend/tests/ -v` → **75 passed**, 0 failed (100%)
- `test_goals.py`'s `_CountingSupabaseClient` 4-query-count assertion still passes — parallelizing changes *when* queries run, not *how many* `.table()` calls happen.

## Task Commit

- `d53b417` — `perf(backend): parallelize independent Supabase queries in fetch_and_rank_goals`

Merged into `main` via fast-forward from the executor's isolated worktree branch (`worktree-agent-af2e9b890dccd30dd`, now deleted).

## Deviations from Plan

- Task 1 (code fix) executed exactly as planned — no deviation.
- Task 2 (manual production spot-check) was explicitly deferred per the plan's own wording ("optional but recommended... a verification step only") — the executor doesn't hold production credentials. The orchestrator re-ran this spot-check itself after push+deploy (see `.planning/phases/02-core-product-loop/02-15-SUMMARY.md` for the re-measurement result).

## Issues Encountered

- The executor's isolated worktree had no `backend/venv/`, and the main repo's venv was missing `pytest`/`pytest-mock` despite being listed in site-packages. Installed both into the existing venv to run verification — a dev-tooling gap, not a scope change. Tests were run via the main repo's venv Python with the worktree as cwd; `rootdir` output confirmed pytest correctly picked up the worktree's modified file.
- **Orchestrator note:** the worktree was removed with `git worktree remove --force` immediately after the fast-forward merge, before checking for uncommitted docs artifacts left behind by the executor (this SUMMARY.md). The file was lost and had to be reconstructed from the executor's returned report rather than the original write. No code was lost (the code commit `d53b417` was already merged before cleanup) — only this documentation file needed reconstruction. Recorded here so future quick-task cleanup checks `git status` inside the worktree for uncommitted paths before force-removing it.

---
*Completed: 2026-07-09*
