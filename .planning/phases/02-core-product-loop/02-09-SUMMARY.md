---
phase: 02-core-product-loop
plan: 09
subsystem: api
tags: [fastapi, supabase, pytest, tdd, idor, batched-aggregation]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: "02-05: POST/GET /api/transactions with server-derived tipe_transaksi/source_label"
provides:
  - "PUT/DELETE /api/transactions/{id} completing Transactions CRUD"
  - "GET /api/wallets saldo computed as derived SUM over transaksi, not a stale stored column"
affects: [dashboard, allocation, goals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derived-SUM wallet balance (Pattern 2 batched aggregation, same as goal progress) — 2 Supabase queries total, never per-wallet N+1"
    - "IDOR-safe PUT/DELETE: double .eq(id, id_pengguna); PUT returns 404 (never 403), DELETE returns 204 unconditionally (no-op for cross-user rows)"

key-files:
  created:
    - backend/tests/test_wallets.py
  modified:
    - backend/routers/transactions.py
    - backend/routers/wallets.py
    - backend/tests/test_transactions.py

key-decisions:
  - "dompet.saldo stored column left in place (create_wallet still inserts 0) but is now cosmetic/unused by any read path — GET /api/wallets always recomputes live"
  - "PUT /api/transactions/{id} re-derives tipe_transaksi/source_label from kategori exactly like POST, never trusting body.tipe_transaksi (T-2-02)"

patterns-established: []

requirements-completed: [TRAN-04, TRAN-05]

# Metrics
duration: 5min
completed: 2026-07-07
---

# Phase 02 Plan 09: Transactions PUT/DELETE + Derived Wallet Saldo Summary

**Completed Transactions CRUD (PUT/DELETE, IDOR-safe, re-deriving labels on edit) and switched `GET /api/wallets` saldo from a stale stored column to a live batched SUM over that wallet's transactions.**

## Performance

- **Duration:** ~5 min (RED/GREEN commit timestamps: 05:19:07 → 05:23:16 UTC+7)
- **Started:** 2026-07-07T05:19:07+07:00
- **Completed:** 2026-07-07T05:23:16+07:00
- **Tasks:** 2 (each RED + GREEN = 4 commits)
- **Files modified:** 4 (2 source, 1 modified test, 1 new test)

## Accomplishments
- `PUT /api/transactions/{id}` re-derives `tipe_transaksi`/`source_label` from the (possibly new) `kategori_id`, exactly matching `POST`'s server-derivation rule — never trusts a client-sent `tipe_transaksi`, even on edit
- `PUT`/`DELETE /api/transactions/{id}` are IDOR-safe: double `.eq("id_transaksi", id).eq("id_pengguna", current_user_id)`; cross-user `PUT` returns `404` (never `403`), cross-user `DELETE` returns `204` as a no-op without touching the other user's row
- `GET /api/wallets` now computes `saldo` live as `SUM(Pemasukan) - SUM(Pengeluaran)` over that wallet's `transaksi` rows, using exactly 2 batched Supabase queries total (dompet, then `transaksi.in_(dompet_ids)`) — resolves RESEARCH.md Pitfall 9 / Assumption A7, matching the same Pattern 2 batched-aggregation approach already used for goal progress

## Task Commits

Each task followed TDD RED → GREEN:

1. **Task 1: PUT/DELETE /api/transactions/{id}**
   - RED: `22c1466` test(02-09): add failing tests for PUT/DELETE /api/transactions/{id}
   - GREEN: `eca7a05` feat(02-09): add PUT/DELETE /api/transactions/{id}
2. **Task 2: Wallet saldo — derived SUM over transactions**
   - RED: `98e1144` test(02-09): add failing tests for derived wallet saldo (SUM over transaksi)
   - GREEN: `742d330` feat(02-09): compute wallet saldo as derived SUM over transaksi

**Plan metadata:** (this commit) docs(02-09): complete plan

_No refactor commit was needed — both GREEN implementations were clean on first pass._

## Files Created/Modified
- `backend/routers/transactions.py` - Added `PUT /transactions/{transaction_id}` (re-derives labels, 404 IDOR-safe) and `DELETE /transactions/{transaction_id}` (204 unconditional, no-op for cross-user rows)
- `backend/routers/wallets.py` - `list_wallets` now sums `transaksi` rows per `dompet_id` (Pemasukan minus Pengeluaran) via one batched `.in_()` query instead of reading the stored `saldo` column; `create_wallet`/`update_wallet` untouched
- `backend/tests/test_transactions.py` - Added 4 tests: PUT re-derivation + ignoring mismatched body `tipe_transaksi`, PUT cross-user 404, DELETE own-row 204+removed, DELETE cross-user 204+no-op
- `backend/tests/test_wallets.py` (new) - 3 tests: derived saldo correctness, exactly-2-batched-queries (via a `_CountingSupabaseClient` wrapper counting `.table()` calls) across 2 wallets, and zero-transaction wallet returns `saldo: 0`

## Decisions Made
- `dompet.saldo` stored column is left in the schema/insert path (legacy, now cosmetic) rather than removed — `create_wallet` still inserts `0` for it, but no read path uses it anymore; removing the column entirely was out of scope for this plan (only `GET`'s behavior needed to change per the plan's `<action>`)
- Test-only fix: the RED-phase test for PUT cross-user 404 initially asserted `response.json()["error"]["code"]`, but FastAPI's default exception handler nests `HTTPException(detail=...)` under a top-level `"detail"` key — corrected to `response.json()["detail"]["error"]["code"]` in the GREEN commit (test bug, not implementation bug; see Deviations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong test assertion path for FastAPI's default HTTPException envelope**
- **Found during:** Task 1, GREEN phase (running the RED tests written for the plan against the new PUT/DELETE implementation)
- **Issue:** The RED test `test_put_transaction_owned_by_another_user_returns_404` asserted `response.json()["error"]["code"] == "NOT_FOUND"`, but FastAPI's default exception handler wraps any `HTTPException(detail=...)` payload under a top-level `"detail"` key (`{"detail": {"error": {...}}}`), not directly at the response root
- **Fix:** Changed the assertion to `response.json()["detail"]["error"]["code"] == "NOT_FOUND"` — no application code was affected; the `wallets.py`-style `{"error": {"code": ..., "message": ...}}` detail shape itself was already correct and unchanged
- **Files modified:** `backend/tests/test_transactions.py`
- **Verification:** `pytest backend/tests/test_transactions.py -x` passes (8/8)
- **Committed in:** `eca7a05` (part of the Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test assertion bug)
**Impact on plan:** Cosmetic test-code correction only; no change to implementation behavior, IDOR-safety, or server-derivation rules. No scope creep.

## Issues Encountered
None - both tasks implemented per the plan's `<action>` sections without needing architectural changes.

## TDD Gate Compliance
RED and GREEN commits present for both tasks in the expected order (`test(02-09)` before matching `feat(02-09)`), verified via `git log --oneline`. No refactor commit needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Transactions CRUD (`POST`/`GET`/`PUT`/`DELETE`) is now fully complete and IDOR-safe (TRAN-04/05 done)
- Wallet balances are always correct after any transaction create/edit/delete, computed the same way as goal progress — unblocks the dashboard's `total_balance` KPI and any future allocation/wallet-balance display work
- No blockers identified for downstream phases

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-07*

## Self-Check: PASSED

All created/modified files found on disk; all 4 task commit hashes (`22c1466`, `eca7a05`, `98e1144`, `742d330`) found in git log.
