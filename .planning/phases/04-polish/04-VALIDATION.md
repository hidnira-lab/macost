---
phase: 4
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend only — confirmed live in `backend/pytest.ini`, `backend/tests/`) |
| **Config file** | `backend/pytest.ini` (`testpaths = backend/tests`) |
| **Quick run command** | `python -m pytest backend/tests/test_transactions.py backend/tests/test_goals.py backend/tests/test_allocations.py -x` (run from repo root — bare `pytest` breaks imports per STATE.md's recorded pitfall) |
| **Full suite command** | `python -m pytest` (from repo root) |
| **Estimated runtime** | ~30 seconds (full suite; prior phases' 123-test suite completed well within CI budget) |

No frontend test framework exists (`apps/web/package.json` has no test script, no jest/vitest config detected). Per CONTEXT.md D-11, frontend behaviors this phase (offline indicator UI, pixel art rendering) are **manual-UAT only** — deliberate scope decision, not a gap.

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest backend/tests/test_transactions.py backend/tests/test_goals.py backend/tests/test_allocations.py -x`
- **After every plan wave:** Run `python -m pytest` (full backend suite, from repo root)
- **Before `/gsd-verify-work`:** Full suite must be green; plus manual UAT checklist for VIS-01/OFF-02 completed in both browser and Tauri desktop build (per D-11)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-XX-XX | TBD | TBD | OFF-01 | V4 | `POST /api/transactions` with a new `idempotency_key` creates exactly one row | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency -x` | ❌ W0 (new cases in existing file) | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-01 | V4 | Retried `POST /api/transactions` with the SAME `idempotency_key` returns the original row, no duplicate created | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency_retry -x` | ❌ W0 | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-01 | V4 | `POST /api/goals` and `PUT /api/goals/{id}` follow the same idempotency-key no-op-on-retry behavior | unit | `python -m pytest backend/tests/test_goals.py -k idempotency -x` | ❌ W0 | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-01 | V4 | `POST /api/allocations` follows the same idempotency-key no-op-on-retry behavior (money-moving endpoint — highest-stakes case) | unit | `python -m pytest backend/tests/test_allocations.py -k idempotency -x` | ❌ W0 | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-01 | V4 | Idempotency key is scoped per-user — user A's key does not collide-detect against user B's identical key value | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency_cross_user -x` | ❌ W0 | ⬜ pending |
| 04-XX-XX | TBD | TBD | VIS-01 | — | Pixel art state-selection function maps `progress_pct` correctly at boundaries (0, 24, 25, 49, 50, 74, 75, 99, 100, >100) | manual | N/A (manual UAT per D-11) | — | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-02 | — | Sync status indicator shows offline → syncing → synced correctly across a real network-drop test (browser + Tauri desktop) | manual | N/A (manual UAT per D-11) | — | ⬜ pending |
| 04-XX-XX | TBD | TBD | OFF-01/D-02 | — | Side-income transaction entered offline defers the allocation-suggestion modal until AFTER sync completes, never at enqueue time | manual | N/A (manual UAT per D-11) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs and plan/wave columns are filled in by the planner once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `backend/migrations/008_add_idempotency_keys.sql` — new migration adding `idempotency_key` (nullable UUID) + `UNIQUE(id_pengguna, idempotency_key)` constraint to `transaksi`, `goal`, `alokasi` tables. Must run against live Supabase before any idempotency test can pass end-to-end (Hidayat-only per platform ownership).
- [ ] Confirm whether `backend/tests/conftest.py`'s fake Supabase client needs a conflict-simulation capability added (currently mimics `.insert()`/`.update()`/`.eq()` but likely has no unique-constraint enforcement) — flagged as an open planning-time decision in 04-RESEARCH.md Wave 0 Gaps.
- [ ] New idempotency test cases across `backend/tests/test_transactions.py`, `test_goals.py`, `test_allocations.py` (existing files, new test functions — no new test files needed).
- [ ] Framework install: none needed — pytest already configured; only new test cases + the migration are required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel art visibly evolves across all 5 states | VIS-01 | Pure visual/rendering correctness, no backend logic to unit test | Open a goal at 0%, 25%, 50%, 75%, 100% progress (seed test data or adjust allocations); confirm the correct `goal-plant-{state}.png` renders crisply (not blurry) at both goal detail and goal list/card sizes, in browser and Tauri desktop |
| Offline transaction entry queues and auto-syncs | OFF-01 | Requires simulating real network loss/recovery, a human-observable timing behavior | Disable network (DevTools offline mode or disconnect Wi-Fi), add a transaction, confirm it's accepted locally without error; re-enable network, confirm the transaction appears server-side without user action (no manual sync button per D-04) |
| Offline goal + allocation actions queue and auto-sync | OFF-01 (D-01 broadened scope) | Same as above, extended to goal/allocation entities; requires observing correct sequential ordering (goal-then-allocation) | While offline, create a goal, then confirm/skip an allocation referencing that same goal; go back online; confirm both sync in the correct order with no 404 on the allocation |
| Sync status indicator reflects true state | OFF-02 | Visual/timing correctness across a live network transition | Watch the indicator through a full offline → queued write → back online → syncing → synced cycle; confirm it never gets stuck or shows a wrong state |
| Deferred allocation suggestion after offline sync | OFF-01/D-02 (non-negotiable suggest-and-confirm rule) | Must observe timing: modal must NOT appear at offline entry, only after sync | Enter a side-income transaction while offline; confirm no suggestion modal appears immediately; go online; confirm the modal appears only once the transaction has synced |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
