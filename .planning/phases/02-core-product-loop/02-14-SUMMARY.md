---
phase: 02-core-product-loop
plan: 14
subsystem: api
tags: [fastapi, dashboard, aggregation, supabase, pytest]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: "02-05 (categories/transactions routers), 02-09 (transactions wallet-balance derivation), 02-10 (goal_service.fetch_and_rank_goals, goal_settings), 02-12 (allocations router)"
provides:
  - "GET /api/dashboard — 5 KPIs (expense_by_category, active_goals_summary, monthly_trend, overspending_alert, total_balance) in fixed research-validated order, period filter (this_month/last_month/custom)"
  - "backend/main.py fully wired — all 6 Phase 2 routers (categories, transactions, goals, goal_settings, allocations, dashboard) registered alongside the existing Phase 1 auth/wallets routers"
  - "test_main_integration.py — the only test file importing the real backend.main:app, regression-guards the T-2-10 auth-on-every-router threat"
affects: [phase-3-ai-integration, frontend-dashboard-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single wider transaksi fetch, all date-range slicing (period/trailing-window/all-time) done in Python over one result set — avoids a 3rd Supabase query, per 02-RESEARCH.md 'Derived Fields' recommendation"
    - "Central router-wiring plan: dashboard is the last feature plan and the designated single point that edits main.py, avoiding a file-conflict cascade across parallel router-creating plans"

key-files:
  created:
    - backend/services/dashboard_service.py
    - backend/routers/dashboard.py
    - backend/tests/test_dashboard.py
    - backend/tests/test_main_integration.py
  modified:
    - backend/main.py

key-decisions:
  - "compute_dashboard() fetches ALL of a user's transaksi rows once (unfiltered by date) and does period/trailing-window/all-time slicing entirely in Python — the fake Supabase test client used across this suite doesn't support .gte()/.lte() chaining, and 02-RESEARCH.md already recommends Python-side aggregation over enabling PostgREST aggregates (a Hidayat-only Supabase dashboard change)"
  - "overspending_alert's trailing-3-month baseline window is defined as the 3 calendar months strictly BEFORE the selected period's start (not anchored to 'today') — avoids a category ever being compared against a baseline that includes its own current-period total, which would happen if the trailing window were fixed relative to 'today' instead of relative to the requested period"
  - "monthly_trend's 3-month window IS anchored to 'today' (real calendar time), independent of the period filter — per the plan's explicit behavior spec: 'trend context is always 3 months' regardless of what period the caller requests"
  - "Backend tests must be run via `python -m pytest` (not bare `pytest`) from the repo root — `backend/pytest.ini`'s presence causes pytest's rootdir/import-path detection to anchor at backend/ instead of the repo root, breaking `from backend.routers import ...` imports under plain `pytest`; `python -m pytest` inserts the repo root onto sys.path[0] and fixes this for every test file in the suite, not just this plan's"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: ~15min
completed: 2026-07-07
---

# Phase 02 Plan 14: Dashboard Aggregation + Central Router Wiring Summary

**GET /api/dashboard with 5 research-ordered KPIs computed from a single batched transaction fetch, plus the central `backend/main.py` wiring step that registers all 6 Phase 2 routers behind auth.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2 completed
- **Files modified:** 5 (2 created services/routers + 2 test files + 1 modified main.py, plus this SUMMARY/STATE/ROADMAP)

## Accomplishments
- `compute_dashboard()` returns `expense_by_category`, `active_goals_summary`, `monthly_trend`, `overspending_alert`, `total_balance` in the exact fixed order required by API_CONTRACT.md §8 / the research-validated KPI priority
- Reuses `goal_service.fetch_and_rank_goals()` for `active_goals_summary` — zero duplicated goal-ranking logic
- `overspending_alert` compares a category's current-period total against its trailing-3-month average (computed from the 3 months strictly before the period, never overlapping it) and flags >20% overruns with a Bahasa Indonesia message naming the category
- `backend/main.py` now registers `categories`, `transactions`, `goals`, `goal_settings`, `allocations`, `dashboard` — every Phase 2 backend endpoint is reachable through the real app, alongside the unmodified Phase 1 `auth`/`wallets` registrations and unmodified CORS config
- `test_main_integration.py` proves (via the real `backend.main:app`) that all 6 new endpoints return 401 unauthenticated and appear in the OpenAPI schema — the T-2-10 critical threat mitigation
- Full backend suite: 75/75 passing (67 pre-existing + 9 new dashboard tests - 1 already counted + 8 new integration tests; net +8 from this plan on top of 67 baseline)

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD): dashboard_service.py — 5-KPI aggregation, period filter**
   - RED: `e0dc5b2` — `test(02-14): add failing tests for dashboard 5-KPI aggregation`
   - GREEN: `39d6d2a` — `feat(02-14): implement dashboard 5-KPI aggregation service and router`
2. **Task 2: Wire all 6 Phase 2 routers into main.py + full-app smoke test** - `8926c11` — `feat(02-14): wire all 6 Phase 2 routers into main.py + integration smoke test`

**Plan metadata:** (this commit) — `docs(02-14): complete dashboard plan`

## Files Created/Modified
- `backend/services/dashboard_service.py` - `compute_dashboard()`: single wider `transaksi` fetch + one `kategori` fetch, all period/trailing/all-time slicing done in Python
- `backend/routers/dashboard.py` - `GET /dashboard` accepting `period`/`start_date`/`end_date` query params
- `backend/tests/test_dashboard.py` - 9 tests covering all 7 plan behaviors + a router-level query-param smoke test
- `backend/main.py` - extended router imports/registrations to include all 6 Phase 2 routers (categories, transactions, goals, goal_settings, allocations, dashboard), CORS and auth/wallets registrations left untouched
- `backend/tests/test_main_integration.py` - imports the real `backend.main:app`; 401-for-all-6-new-paths regression guard (T-2-10) + OpenAPI schema presence check + existing auth/wallets sanity check

## Decisions Made
- Overspending trailing-3-month window is relative to the selected period's start (not to "today"), so it never overlaps the period being measured — see `key-decisions` above.
- `monthly_trend`'s 3-month window IS relative to "today", independent of the `period` filter, per the plan's explicit spec.
- Tests/verification must use `python -m pytest` from the repo root, not bare `pytest` (see Issues Encountered) — documented so future plans in this phase don't hit the same import failure.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<behavior>`/`<action>`/`<acceptance_criteria>` were implemented literally; no architectural changes, no missing-critical-functionality gaps found beyond what the plan already specified (auth on every router was already correctly present in all 5 pre-existing routers per visual inspection, confirming T-2-10 is satisfied rather than requiring a fix).

## Issues Encountered

- **Bare `pytest backend/tests/...` fails to import `backend.*` modules in this environment.** `backend/pytest.ini` (containing only `testpaths = backend/tests`) causes pytest's rootdir/import-mode detection to anchor sys.path insertion at `backend/` rather than the repo root, so `from backend.routers import dashboard` raises `ModuleNotFoundError: No module named 'backend'`. This is a pre-existing environment characteristic, not something introduced by this plan (confirmed by reproducing the identical failure against `test_goals.py`, a file from an earlier plan, with plain `pytest`). Resolved by using `python -m pytest backend/tests/... ` instead, which additionally inserts the repo root (cwd) onto `sys.path[0]`. Also confirmed a repo-root `venv/` (not `backend/venv/`) already has all dependencies installed (Python 3.12.7, pytest 9.1.1, fastapi, jwt) — used that rather than creating a new venv.
- A pre-existing `UserWarning: Duplicate Operation ID health_check_health_get for function health_check` appears when generating the OpenAPI schema (from the pre-existing `@app.api_route("/health", methods=["GET","HEAD"])` route) — harmless, unrelated to this plan's changes, not fixed (out of scope per SCOPE BOUNDARY — pre-existing warning in a file this plan doesn't own the health-route portion of).

## Next Phase Readiness

- Phase 2 backend is now feature-complete and fully wired: all 6 new Phase 2 endpoints (categories, transactions, goals, goal-settings, allocations, dashboard) are live in `backend.main:app`, all confirmed auth-protected, full suite green (75/75).
- Remaining Phase 2 backend plans (02-03, 02-06, 02-07, 02-08, 02-11, 02-13 per the incomplete_plans list) still need review/execution or may be already superseded by this wiring — the orchestrator should confirm which of those are genuinely outstanding vs. already covered by 02-05/02-09/02-10/02-12/02-14's actual delivered scope before Phase 3 planning begins.
- Frontend dashboard integration (Zarra, `apps/web/` Home/Dashboard area) can now point at the real `GET /api/dashboard` instead of `apps/web/mocks/dashboard.json` — response shape matches the mock's key order and field names exactly.

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-07*

## Self-Check: PASSED

All created files verified present on disk; all 3 task commit hashes (`e0dc5b2`, `39d6d2a`, `8926c11`) verified present in git history.
