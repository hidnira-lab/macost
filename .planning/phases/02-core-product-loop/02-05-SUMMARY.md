---
phase: 02-core-product-loop
plan: 05
subsystem: api
tags: [fastapi, pydantic, supabase, tdd, transactions, categories]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: "02-01 migrations (kategori/transaksi tables), pytest infra, conftest.py fixtures (fake_supabase_client, sample_goals, sample_weights)"
provides:
  - "GET /api/categories router (read-only, unscoped shared taxonomy)"
  - "POST/GET /api/transactions router (server-derived tipe_transaksi/source_label, IDOR-safe filtered+paginated list)"
  - "backend/models/category.py, backend/models/transaction.py Pydantic models"
affects: [02-14 (central router wiring), 02-06 (allocation service depends on transaksi rows existing), frontend transaction form/history integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Isolated router test pattern: bare FastAPI() + app.include_router(router, prefix='/api') + app.dependency_overrides, independent of backend/main.py central wiring"
    - "Client-generated id_transaksi/created_at at insert time (not relying on DB DEFAULT) so the inserted row is immediately usable from both the fake test client and real Supabase client"
    - "Python-side pagination (list slicing) over an already user/filter-scoped result set, avoiding a chainable .range() dependency on the test double"

key-files:
  created:
    - backend/models/category.py
    - backend/routers/categories.py
    - backend/models/transaction.py
    - backend/routers/transactions.py
    - backend/tests/test_categories.py
    - backend/tests/test_transactions.py
  modified: []

key-decisions:
  - "tipe_transaksi/source_label always derived server-side from the looked-up kategori row (kategori.tipe / kategori.flag_pemasukan); TransactionCreate.tipe_transaksi is accepted but structurally never read (D-01/Pitfall 1, T-2-02 mitigation)"
  - "GET /api/transactions unconditionally scopes every query by .eq('id_pengguna', current_user_id) in addition to any optional filter (T-2-01 IDOR mitigation)"
  - "GET /api/categories intentionally has NO id_pengguna scoping — kategori is a shared, unscoped, read-only table per its kategori_select_all RLS policy"
  - "id_transaksi and created_at are generated in the router (uuid4 + datetime.now(UTC).isoformat()) rather than relying on Postgres DEFAULT gen_random_uuid()/NOW() — keeps POST's returned row immediately usable against both the in-memory fake Supabase client (which only auto-fills a generic 'id' key, not table-specific PKs) and the real Supabase client (which accepts an explicit PK/timestamp on insert without conflict)"
  - "Pagination for GET /api/transactions implemented as Python list slicing over the already-filtered/scoped rows, not a chained Supabase .range() call — functionally equivalent, and avoids depending on a .range()/.gte()/.lte() capability the shared conftest.py fake query builder didn't yet implement (conftest.py was out of this plan's file scope)"

patterns-established:
  - "Router test isolation: every new Phase 2 router gets its own bare-FastAPI TestClient test file, never importing backend.main:app, so router-level unit tests have zero coupling to central wiring order (02-14-PLAN.md)"

requirements-completed: [TRAN-01, TRAN-02, TRAN-03]

# Metrics
duration: 30min
completed: 2026-07-06
---

# Phase 2 Plan 05: Categories + Transactions (create/list) Summary

**`GET /api/categories` (unscoped read-only) plus `POST`/`GET /api/transactions` with server-derived, request-body-immune `tipe_transaksi`/`source_label` and IDOR-safe filtered/paginated history — the backend half of the side-income auto-labeling core loop.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-06T21:42:19Z (per STATE.md session start)
- **Completed:** 2026-07-06T22:04:40Z
- **Tasks:** 2 completed
- **Files modified:** 6 (all new)

## Accomplishments

- `GET /api/categories` returns the full shared kategori taxonomy behind auth, deliberately without per-user scoping (categories are a shared read-only table)
- `POST /api/transactions` looks up the selected kategori and derives `tipe_transaksi`/`source_label` exclusively from `kategori.tipe`/`kategori.flag_pemasukan` — verified to ignore `body.tipe_transaksi` even when a caller explicitly sends a mismatched value (the exact scenario D-01/Pitfall 1 warns about)
- `nominal <= 0` is rejected with `422` by Pydantic's `Field(gt=0)` before any DB write is attempted
- `GET /api/transactions` supports `start_date`/`end_date`/`category_id`/`source`/`page`/`limit` filtering, and unconditionally scopes every query by the authenticated user — verified with a seeded cross-user row sharing the same `category_id` that never leaks into the response

## Task Commits

Each task followed the plan's mandatory RED → GREEN sequence:

1. **Task 1: `GET /api/categories`**
   - `86d330d` — `test(02-05): add failing test for GET /api/categories` (RED)
   - `b6f4e37` — `feat(02-05): implement GET /api/categories (read-only, unscoped)` (GREEN)
2. **Task 2: Transactions — create + list**
   - `b2c6b2e` — `test(02-05): add failing tests for POST/GET /api/transactions` (RED)
   - `00c1844` — `feat(02-05): implement POST/GET /api/transactions` (GREEN)

_No refactor commit was needed — both implementations were clean on first GREEN pass._

## Files Created/Modified

- `backend/models/category.py` — `CategoryResponse` Pydantic model
- `backend/routers/categories.py` — `GET /categories`, auth-required but unscoped by user
- `backend/models/transaction.py` — `TransactionCreate`/`TransactionUpdate`/`TransactionResponse`
- `backend/routers/transactions.py` — `POST /transactions` (server-derived label), `GET /transactions` (filtered/paginated/IDOR-safe)
- `backend/tests/test_categories.py` — 2 tests (200-with-token, 401-without-header)
- `backend/tests/test_transactions.py` — 4 tests covering all `<behavior>` cases from the plan

Neither router is registered in `backend/main.py` — central wiring is explicitly deferred to `02-14-PLAN.md` per this plan's instructions.

## Decisions Made

- **Client-generated `id_transaksi`/`created_at`:** The plan's reference `Pattern 1` snippet in 02-RESEARCH.md relies on the DB's `gen_random_uuid()`/`NOW()` defaults populating the returned row. `backend/tests/conftest.py`'s `FakeSupabaseClient.insert()` only auto-fills a generic `"id"` key (not table-specific PKs like `id_transaksi`), and modifying `conftest.py` was out of this plan's file scope. Generating the UUID and timestamp in the router itself and including them explicitly in the insert payload keeps the returned row correctly shaped against both the fake test client and the real Supabase client (which accepts an explicit PK/timestamp override on insert without any conflict). This is a Rule 1 (bug-avoidance)-style implementation choice — no observable API contract change (`id_transaksi`/`created_at` still appear in the response exactly as documented in `API_CONTRACT.md` §4).
- **Python-side pagination instead of `.range()`:** The plan's `<action>` text suggested `.range((page-1)*limit, page*limit-1)`. The shared `_FakeQuery` test double (`backend/tests/conftest.py`, out of this plan's file scope) doesn't implement `.range()`/`.gte()`/`.lte()`. Implemented pagination as a Python list slice over the already user/filter-scoped rows instead — functionally identical (`total`/`page`/`transactions` shape is unchanged, still matches `API_CONTRACT.md` §4), and consistent with 02-RESEARCH.md's broader "Python-side aggregation over SQL aggregation" recommendation for this phase. Date-range filters (`start_date`/`end_date`) still call `.gte()`/`.lte()` on the real Supabase client when those params are provided — the fake client's lack of those methods only matters for tests, and no behavior test in this plan exercises date-range filtering (not required by the 4 listed `<behavior>` cases).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fake Supabase test client can't return table-specific primary keys from `insert()`**
- **Found during:** Task 2 (writing the GREEN implementation for `POST /api/transactions`)
- **Issue:** `backend/tests/conftest.py`'s `_FakeQuery.execute()` only does `new_row.setdefault("id", str(uuid.uuid4()))` on insert — it never sets `id_transaksi` (or any other table-specific PK name), unlike a real Postgres `DEFAULT gen_random_uuid()` column. Following the plan's reference pattern literally (omit the PK from the insert dict and read it back from `result.data[0]["id_transaksi"]`) would `KeyError` against the fake client.
- **Fix:** Generate `id_transaksi` (via `uuid.uuid4()`) and `created_at` (via `datetime.now(timezone.utc).isoformat()`) in the router and include them explicitly in the insert payload, so the key is always present in the row regardless of which Supabase client (fake or real) is used.
- **Files modified:** `backend/routers/transactions.py`
- **Verification:** `pytest backend/tests/test_transactions.py -x` — all 4 tests pass, including assertions on `id_transaksi` in both POST and GET responses.
- **Committed in:** `00c1844` (part of Task 2's GREEN commit)

**2. [Rule 3 - Blocking issue] Fake Supabase test client has no `.range()`/`.gte()`/`.lte()` methods**
- **Found during:** Task 2 (designing the `GET /api/transactions` GREEN implementation)
- **Issue:** The plan's `<action>` specifies `.range((page-1)*limit, page*limit-1)` for pagination, chained onto a query that may also call `.gte()`/`.lte()` for date filters. `backend/tests/conftest.py`'s `_FakeQuery` (shared fixture, out of this plan's file scope) implements only `select`/`eq`/`in_`/`insert`/`update`/`delete`/`execute` — no `.range()`.
- **Fix:** Paginate in Python (`rows[start_idx:end_idx]`) after fetching the already user/filter-scoped rows, instead of chaining `.range()` on the Supabase query builder. `.gte()`/`.lte()` calls remain in the code path (they execute fine against the real Supabase client) but are gated behind `if start_date:`/`if end_date:` conditionals, so no test in this plan's required `<behavior>` set exercises them against the fake client.
- **Files modified:** `backend/routers/transactions.py`
- **Verification:** `pytest backend/tests/test_transactions.py -x` — the IDOR/category-filter test (`test_get_transactions_filtered_by_category_never_leaks_other_users_rows`) confirms filtering + pagination shape (`total`, `page`, `transactions`) all work correctly.
- **Committed in:** `00c1844` (part of Task 2's GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1/3 — both necessary adaptations to the shared test double's limited surface area, not changes to the actual API contract or business logic; `conftest.py` itself was intentionally left untouched per this plan's file scope restriction).
**Impact on plan:** No scope creep — both adaptations are internal implementation details. `API_CONTRACT.md` §3/§4 response shapes are unchanged; all plan-mandated behavior (server-derived labels, IDOR-safe scoping, 422 on invalid nominal) is verified exactly as specified.

## Issues Encountered

- No project-committed Python virtualenv existed in this execution environment (`backend/venv/` referenced in `.claude/CLAUDE.md` was absent — evidently machine-specific, not checked in, and correctly `.gitignore`d). Created a fresh `backend/venv` and installed `backend/requirements.txt` packages locally to run `pytest`; this venv is gitignored and was not committed.
- Confirmed via direct inspection of the installed FastAPI version's `HTTPBearer.__call__`/`make_not_authenticated_error` that a missing `Authorization` header returns `401` (not the older Starlette/FastAPI default of `403`) — this matches the plan's required 401-without-token behavior without needing any custom auth-dependency override for that test case.

## User Setup Required

None — no external service configuration required. Both routers reuse the already-provisioned Supabase project and existing `kategori`/`transaksi` tables from `02-01-PLAN.md`'s migrations (already applied to the live project per STATE.md).

## Next Phase Readiness

- `backend/routers/categories.py` and `backend/routers/transactions.py` are both fully unit-tested in isolation and ready for `02-14-PLAN.md` to register them in `backend/main.py` alongside the other Phase 2 routers.
- `POST /api/transactions`'s `allocation_suggestion_available` signal is in place and ready to drive `02-06-PLAN.md`'s allocation-suggestion flow (transaction rows with `source_label == "Flexible Side Income"` now exist and are queryable).
- No blockers. `apps/web/package-lock.json`'s pre-existing uncommitted change was left untouched throughout, as instructed.

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-06*

## Self-Check: PASSED

All 6 created files verified present on disk; all 4 task commit hashes (`86d330d`, `b6f4e37`, `b2c6b2e`, `00c1844`) verified present in `git log --all`.
