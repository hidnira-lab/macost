---
phase: 02-core-product-loop
plan: 01
subsystem: database
tags: [sql, supabase, rls, pytest, httpx, testing]

requires:
  - phase: 01-foundation
    provides: backend/migrations/001_create_dompet.sql RLS/PK convention this plan mirrors
provides:
  - 6 ready-to-paste SQL migration files for kategori, transaksi, goal, alokasi, goal_settings, and category seed data
  - Working pytest infrastructure runnable from repo root with shared fixtures
affects: [02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12, 02-13]

tech-stack:
  added: [pytest>=8.0.0, httpx>=0.27.0]
  patterns:
    - "RLS policies mirror 001_create_dompet.sql exactly: 4 policies (select/insert/update/delete_own) scoped auth.uid() = id_pengguna, or 1 read-only select_all policy for reference tables like kategori"
    - "Computed goal fields (skor_kepentingan, nominal_terkumpul, progress_pct, rank) deliberately excluded from schema — always derived in application code, never persisted"
    - "fake_supabase_client fixture chainable interface (.table().select().eq().in_().insert().update().delete().execute()) backed by an in-memory per-test dict — no backend test hits the live Supabase project"

key-files:
  created:
    - backend/migrations/002_create_kategori.sql
    - backend/migrations/003_create_transaksi.sql
    - backend/migrations/004_create_goal.sql
    - backend/migrations/005_create_alokasi.sql
    - backend/migrations/006_create_goal_settings.sql
    - backend/migrations/007_seed_kategori.sql
    - backend/pytest.ini
    - backend/tests/__init__.py
    - backend/tests/conftest.py
    - backend/tests/test_smoke.py
  modified:
    - backend/requirements.txt

key-decisions:
  - "Migration files are not executed against live Supabase by this plan — Hidayat pushes them via Dashboard SQL Editor in the separate blocking plan 02-06"
  - "sample_goals fixture deliberately gives goals 2 and 3 identical skor_keinginan (3) and identical far-out deadlines to exercise SAW-02's tie-break case"

patterns-established:
  - "Pattern 1: Every new table gets RLS policies named {table}_{action}_own mirroring 001_create_dompet.sql verbatim"
  - "Pattern 2: pytest.ini at backend/pytest.ini with testpaths=backend/tests makes `pytest` runnable from repo root, matching the project's absolute-import convention (from backend.X import Y)"

requirements-completed: [TRAN-02, GOAL-01, SAW-01, SAW-02, SAW-03, ALLOC-04, ALLOC-05]

duration: ~15min
completed: 2026-07-05
---

# Phase 02-01: Migrations + Test Infrastructure Summary

**6 Phase 2 SQL migration files (kategori, transaksi, goal, alokasi, goal_settings, seed data) plus a working pytest setup with fake-Supabase fixtures for every downstream backend test**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-05T12:22:18Z
- **Tasks:** 2
- **Files modified:** 11 (10 created, 1 modified)

## Accomplishments
- All 5 new Phase 2 tables have ready-to-paste migration files following the exact `001_create_dompet.sql` RLS/PK convention
- `pytest` runs from repo root with `fake_supabase_client`, `sample_goals`, and `sample_weights` fixtures available to every later Phase 2 backend test

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migrations 002-007** - `b1cbb13` (feat)
2. **Task 2: Backend test infrastructure — pytest, httpx, shared fixtures** - `7cc4449` (feat)

## Files Created/Modified
- `backend/migrations/002_create_kategori.sql` - kategori table, RLS read-only for all authenticated users
- `backend/migrations/003_create_transaksi.sql` - transaksi table, 4 own-scoped RLS policies
- `backend/migrations/004_create_goal.sql` - goal table, 4 own-scoped RLS policies, computed fields excluded by design
- `backend/migrations/005_create_alokasi.sql` - alokasi table, 4 own-scoped RLS policies
- `backend/migrations/006_create_goal_settings.sql` - goal_settings table with default SAW weights JSONB, no delete policy
- `backend/migrations/007_seed_kategori.sql` - 5 expense + 2 income category seed rows (TC-05 taxonomy)
- `backend/requirements.txt` - added pytest>=8.0.0, httpx>=0.27.0
- `backend/pytest.ini` - testpaths=backend/tests, enables repo-root test runs
- `backend/tests/__init__.py` - empty marker file
- `backend/tests/conftest.py` - fake_supabase_client, sample_goals, sample_weights fixtures
- `backend/tests/test_smoke.py` - test_pytest_infra_works sanity test

## Decisions Made
None beyond what's captured in key-decisions above — plan executed as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The first executor attempt (subagent, worktree isolation) hit the Claude session usage limit mid-Task 2, after Task 1 was already committed (`b1cbb13`) and Task 2's files were fully written but uncommitted. The orchestrator verified the already-written Task 2 files matched the plan spec, created a Python 3.12 venv, ran `pip install -r backend/requirements.txt` and `pytest backend/tests/test_smoke.py -x` (both passed), removed the venv/pytest-cache (gitignored, not for commit), and committed Task 2 (`7cc4449`) directly to close out the plan without re-dispatching a new subagent.

## User Setup Required

None from this plan directly. Note: the 6 migration files are not yet applied to the live Supabase project — that push is the separate Hidayat-only blocking plan `02-06-PLAN.md`.

## Next Phase Readiness
- Wave 2 plans depending on `02-01` (02-04 SAW engine, 02-05 Categories/Transactions API, 02-06 Hidayat Supabase push) can now start
- `backend/tests/conftest.py` fixtures are ready for every downstream backend test file in this phase

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-05*
