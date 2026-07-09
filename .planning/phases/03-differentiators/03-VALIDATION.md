---
phase: 3
slug: differentiators
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest >=8.0.0 (backend only — confirmed live in `backend/pytest.ini`, `backend/tests/`) |
| **Config file** | `backend/pytest.ini` (`testpaths = backend/tests`) |
| **Quick run command** | `python -m pytest backend/tests/test_<changed_file>.py -x` (run from repo root — bare `pytest` breaks imports per STATE.md's recorded pitfall) |
| **Full suite command** | `python -m pytest backend/tests/` (from repo root) |
| **Estimated runtime** | ~30 seconds |

No frontend test framework exists (`apps/web/package.json` has no test script, no jest/vitest config detected). Frontend verification for this phase continues the project's established manual/UAT pattern (per `human_verify_mode: end-of-phase` in `.planning/config.json`).

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest backend/tests/test_<changed_file>.py -x`
- **After every plan wave:** Run `python -m pytest backend/tests/` (full backend suite, from repo root)
- **Before `/gsd-verify-work`:** Full suite must be green; all mocked-Gemini unit tests must not make live API calls (mock `client.aio.models.generate_content` at the test boundary, consistent with `FakeSupabaseClient`'s existing mocking philosophy in `conftest.py`)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-XX-XX | TBD | TBD | SCAN-01 | V5 | Successful extraction returns expected shape from a mocked Gemini response | unit | `pytest backend/tests/test_gemini_service.py::test_extract_receipt_success -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | SCAN-03 | V5 | Timeout/failure returns `extracted:false` + `error_message`, no retry attempted | unit | `pytest backend/tests/test_gemini_service.py::test_extract_receipt_timeout -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | ESTAT-01 | V5/V12 | PDF extraction returns `extracted_transactions[]` shape | unit | `pytest backend/tests/test_gemini_service.py::test_extract_statement_success -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | ESTAT-02 | V4 | Duplicate flag set correctly for (tanggal+nominal) match | unit | `pytest backend/tests/test_statement_service.py::test_duplicate_detection -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | ESTAT-03 | — | Batch import reports correct imported_count/skipped_count | unit | `pytest backend/tests/test_transactions.py::test_import_batch_counts -x` | ❌ W0 (new test in existing file) | ⬜ pending |
| 03-XX-XX | TBD | TBD | AIINS-02 | V5 | Insight schema rejects both `related_*` null | unit | `pytest backend/tests/test_insight_service.py::test_related_invariant -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | AIINS-03 | — | 15s timeout returns `insight_available:false` + `fallback_message` | unit | `pytest backend/tests/test_insight_service.py::test_insight_timeout -x` | ❌ W0 | ⬜ pending |
| 03-XX-XX | TBD | TBD | SAW-04 | — | ±0.002 tolerance already covered | unit | `pytest backend/tests/test_goal_settings.py -x` | ✅ existing | ⬜ pending |
| 03-XX-XX | TBD | TBD | SAW-05 | — | Reset restores exact DEFAULT_WEIGHTS | unit | extend `backend/tests/test_goal_settings.py` | ✅ file exists, add case | ⬜ pending |
| 03-XX-XX | TBD | TBD | QAP-01 | — | 4-shortcut panel, one-tap navigation | manual | N/A | — | ⬜ pending |
| 03-XX-XX | TBD | TBD | SCAN-02 | — | Review-before-save UI flow, never auto-saved | manual | N/A | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs and plan/wave columns are filled in by the planner once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_gemini_service.py` — covers SCAN-01, SCAN-03, ESTAT-01, and a shared "Gemini call mocking" fixture pattern (new `conftest.py` fixture, e.g. `fake_gemini_response`)
- [ ] `backend/tests/test_statement_service.py` — covers ESTAT-02 duplicate detection
- [ ] `backend/tests/test_insight_service.py` — covers AIINS-02 (related_* invariant) and AIINS-03 (timeout)
- [ ] New `conftest.py` fixture: a fake/mock Gemini client double (mirroring the existing `FakeSupabaseClient` pattern) so unit tests never call the real Gemini API
- [ ] Framework install: none needed — pytest already configured; only new test files needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quick Access Panel renders exactly 4 shortcuts, each navigates in one tap | QAP-01 | Pure frontend composition, no backend logic to unit test; visual/interaction correctness | Log in, land on Home, confirm 4 shortcuts visible (add transaction, scan receipt, top goal, balance), tap each, confirm correct navigation target |
| Receipt scan review form never auto-saves extracted data | SCAN-02 | UI review-and-confirm flow, requires human judgment of "did it wait for my confirmation" | Upload a receipt image, confirm extracted fields appear in an editable form, edit a field, confirm nothing is persisted until explicit Save is clicked |
| E-statement import UI defaults/toggles | ESTAT-02 | Visual checkbox-state correctness across duplicate vs non-duplicate rows | Upload a PDF with a known duplicate transaction, confirm duplicate row is unchecked by default and others checked, toggle and confirm import respects final selection |
| AI insight card renders action verb + link | AIINS-02 | Visual rendering + navigation correctness | Open /ai page, confirm each insight shows one of Alokasikan/Kurangi/Pertimbangkan and links to the correct goal or category |
| SAW weight editor live re-rank preview | SAW-04/05 | Visual feedback loop correctness | Open SAW settings, adjust a weight, confirm goal ranking preview updates without saving; click Reset, confirm weights return to n=62 defaults |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
