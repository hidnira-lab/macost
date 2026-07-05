---
phase: 2
slug: core-product-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (+ httpx for FastAPI TestClient) — not yet installed on backend |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd backend && pytest tests/test_saw_engine.py -x` |
| **Full suite command** | `cd backend && pytest` |
| **Estimated runtime** | ~5-10 seconds (small unit/integration suite, no live network calls expected in unit tests) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pytest tests/test_<module>.py -x` for whatever module the task touched
- **After every plan wave:** Run `cd backend && pytest` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green; SAW engine tests are the highest-value automated coverage given SAW-02 is an explicit, crash-prone requirement
- **Max feedback latency:** ~10 seconds (pure-Python unit tests, no external service calls)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-XX-01 | TBD | 0 | SAW-02 | — | 0 goals → empty list, no crash | unit | `pytest tests/test_saw_engine.py::test_zero_goals -x` | ❌ W0 | ⬜ pending |
| 02-XX-02 | TBD | 0 | SAW-02 | — | 1 goal → rank=1, no normalization | unit | `pytest tests/test_saw_engine.py::test_single_goal -x` | ❌ W0 | ⬜ pending |
| 02-XX-03 | TBD | 0 | SAW-02 | — | Identical criteria values → stable tie-break, no crash | unit | `pytest tests/test_saw_engine.py::test_identical_values_tiebreak -x` | ❌ W0 | ⬜ pending |
| 02-XX-04 | TBD | 0 | SAW-01 | — | 5-criteria weighted ranking produces expected order (TC-01..TC-04 formulas) for a known fixture | unit | `pytest tests/test_saw_engine.py::test_known_ranking_order -x` | ❌ W0 | ⬜ pending |
| 02-XX-05 | TBD | 0 | SAW-03 | — | Strategy toggle (TC-01 re-weighting) produces a different order for the same stored weights | unit | `pytest tests/test_saw_engine.py::test_strategy_toggle_changes_order -x` | ❌ W0 | ⬜ pending |
| 02-XX-06 | TBD | 0 | ALLOC-02 | T-2-01 | Suggested amount is 29-40% of transaction nominal | unit | `pytest tests/test_allocation_service.py::test_suggested_pct_in_range -x` | ❌ W0 | ⬜ pending |
| 02-XX-07 | TBD | 0 | TRAN-02 | T-2-02 | POST with side-income category → `source_label`/`tipe_transaksi` correctly derived server-side regardless of body content (D-01) | integration | `pytest tests/test_transactions.py::test_source_label_derivation -x` | ❌ W0 | ⬜ pending |
| 02-XX-08 | TBD | 0 | GOAL-02 | — | `nominal_terkumpul`/`progress_pct` match SUM of `alokasi` fixtures (batched query, no N+1) | unit | `pytest tests/test_goals.py::test_progress_computation -x` | ❌ W0 | ⬜ pending |
| 02-XX-09 | TBD | 0 | DASH-01/DASH-02 | — | Dashboard KPI order matches fixed research-validated sequence; period filter changes result set | integration | `pytest tests/test_dashboard.py::test_kpi_order_and_period_filter -x` | ❌ W0 | ⬜ pending |
| 02-XX-10 | TBD | 0 | ALLOC-01 | T-2-03 | `GET /api/transactions/{id}/allocation-suggestion` re-validates transaction is side-income before computing suggestion | unit | `pytest tests/test_allocation_service.py::test_rejects_non_side_income -x` | ❌ W0 | ⬜ pending |
| 02-XX-11 | TBD | — | TRAN-01, TRAN-03, TRAN-04, TRAN-05, GOAL-01, GOAL-03, GOAL-04, GOAL-05, ALLOC-03, ALLOC-04, ALLOC-05 | T-2-04 | CRUD/UX flows (Figma-driven UI, IDOR double-scoping, suggest-and-confirm never auto-executes) | manual UAT | conversational UAT via `/gsd-verify-work` | n/a — manual by design | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/requirements-dev.txt` (or add to `requirements.txt`) — `pytest`, `httpx` — no test framework installed yet
- [ ] `backend/tests/conftest.py` — shared fixtures (sample goals list, sample weights per TC-01..TC-04, a way to stub/fake the Supabase client for unit tests that shouldn't hit the live DB)
- [ ] `backend/tests/test_saw_engine.py` — the SAW-02 edge-case tests are the single most important automated check this phase produces; must exercise the TC-01 re-weighting mechanism, TC-04 benefit-direction `target_amount`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Transaction quick-entry form (≤3 required fields, tipe_transaksi never sent, tanggal defaults today) | TRAN-01 | Figma-driven UI, D-01/D-02 UX behavior not unit-testable | Open transaction form, confirm only nominal/kategori/dompet are required, tanggal pre-filled with today, submit succeeds without a `tipe_transaksi` field in the request payload (inspect network tab) |
| Allocation suggestion modal timing/error handling (D-03/D-04) | ALLOC-01 | Requires live UI interaction + timing observation against a real or simulated slow backend | Save a side-income transaction, confirm loading overlay appears immediately, transitions to modal on response; simulate a failed suggestion request and confirm toast + transaction remains saved |
| SAW strategy toggle persists via `PUT /api/goal-settings` and re-renders ranking (D-05) | SAW-03 | UI + API interaction, visual ranking change | Toggle strategy on Goals page, confirm network call to `PUT /api/goal-settings`, confirm goal list re-renders in a different order |
| Empty states (D-06) | DASH-01, GOAL-02 | Visual/content check against a fresh account | Log in with a brand-new account with zero transactions/goals, confirm each Dashboard KPI and the Goals page shows a section-scoped placeholder + CTA, not a crash or blank screen |
| ≤2 second allocation-suggestion latency on real backend | ALLOC-01 (ROADMAP success criterion 2) | Requires live Railway+Supabase stack, not representative on localhost | Hidayat's integration session (Days 6-8 per ROADMAP.md): time `POST /api/transactions` → `GET .../allocation-suggestion` round trip against the deployed Railway backend |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
