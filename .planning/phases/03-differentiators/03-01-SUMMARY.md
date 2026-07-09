---
phase: 03-differentiators
plan: 01
subsystem: api
tags: [gemini, google-genai, pydantic, asyncio, ai-vision, backend]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: FastAPI backend conventions (models/, services/, tests/conftest.py FakeSupabaseClient pattern), backend/dependencies/auth.py lazy-singleton pattern
provides:
  - "backend/core/gemini_client.py: cached genai.Client() singleton (get_gemini_client())"
  - "backend/services/gemini_service.py: extract_receipt(), extract_statement(), generate_insight() -- async, timeout-wrapped, broad-except-to-None"
  - "backend/models/receipt.py, statement.py, insight.py: Pydantic response_schema models for SCAN-01/ESTAT-01/AIINS-02"
  - "backend/tests/conftest.py: fake_gemini_response + spy_wait_for_timeout fixtures for mocking Gemini calls in downstream test files"
affects: [03-05-receipt-scan, 03-06-e-statement-import, 03-07-ai-insights]

# Tech tracking
tech-stack:
  added: ["google-genai>=2.10.0"]
  patterns:
    - "Gemini structured-output extraction via client.aio.models.generate_content(..., config={response_mime_type, response_schema}) wrapped in asyncio.wait_for -- async client only, never sync, to avoid blocking the FastAPI event loop"
    - "Broad except Exception -> None fallback for all Gemini calls, no differentiated retry (D-01)"
    - "Cross-field Pydantic invariant via @model_validator(mode='after') for InsightItem's related_goal_id/related_category_id OR constraint"
    - "Test doubles for external async SDK clients: fake .aio.models.generate_content coroutine configured per-test (success text vs raised exception), monkeypatched at the call site's own module namespace (patch-where-used, not patch-where-defined) since gemini_service.py imports get_gemini_client via `from ... import`"

key-files:
  created:
    - backend/core/gemini_client.py
    - backend/services/gemini_service.py
    - backend/models/receipt.py
    - backend/models/statement.py
    - backend/models/insight.py
    - backend/tests/test_insight_model.py
    - backend/tests/test_gemini_service.py
  modified:
    - backend/requirements.txt
    - backend/tests/conftest.py

key-decisions:
  - "google-genai>=2.10.0 verified as the official googleapis/python-genai SDK (Task 0 package-legitimacy checkpoint cleared by user against PyPI/GitHub before install)"
  - "extract_statement() timeout set to 15.0s (STATEMENT_TIMEOUT_SECONDS module constant) -- not explicitly locked by any requirement, planner-chosen default per RESEARCH.md Open Question #1, reusing the AIINS-03 15s constant for consistency"
  - "No pytest-asyncio dependency added -- async gemini_service functions are tested via asyncio.run() inside plain sync test functions, avoiding a new, plan-unlisted package install (per the package-install exclusion in the executor's deviation rules)"
  - "fake_gemini_response/spy_wait_for_timeout fixtures monkeypatch backend.services.gemini_service's own get_gemini_client/asyncio bindings directly (patch-where-used), not backend.core.gemini_client's -- gemini_service.py imports the name via `from backend.core.gemini_client import get_gemini_client`, so patching the origin module would not affect the already-bound name in gemini_service's namespace"
  - "pip install run against backend/venv (not the sibling /Users/macbookpro/macost/venv) per the plan's explicit Task 1 instruction -- both venvs already had fastapi/pydantic installed independently; backend/venv is the one actually used by backend/pytest.ini and this project's test invocation convention (python -m pytest from repo root)"

patterns-established:
  - "Pattern: any new external-LLM-SDK integration in this backend follows gemini_client.py's lazy-singleton + gemini_service.py's timeout-wrapped-async-call-to-None-on-failure shape"
  - "Pattern: Pydantic response_schema models double as both the Gemini structured-output contract and the server-side validation layer (Field(gt=0) guards against a manipulated/malicious extraction result) -- no separate DTO"

requirements-completed: [SCAN-01, ESTAT-01, AIINS-02]

# Metrics
duration: ~40min (Task 1 + Task 2 implementation; excludes Task 0 checkpoint wait time for user's manual PyPI verification)
completed: 2026-07-09
---

# Phase 3 Plan 01: Gemini Integration Layer Summary

**Shared Gemini 2.5 Flash service layer (async client, 10s/15s/15s timeouts, broad-except-to-None fallback) plus three Pydantic response_schema models (ReceiptExtraction, StatementExtractionList, InsightItem) that Plans 03-05/03-06/03-07 all import directly.**

## Performance

- **Duration:** ~40 min (Task 1 + Task 2 implementation work; Task 0's checkpoint wait for user's manual PyPI/GitHub verification is excluded as it was idle time, not executor work)
- **Started:** 2026-07-09 (Task 0 checkpoint reached ~14:20 local; resumed and completed after "verified" response)
- **Completed:** 2026-07-09T15:38:29+07:00
- **Tasks:** 3 (Task 0 checkpoint + Task 1 + Task 2), all complete
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments
- `backend/core/gemini_client.py` provides one cached `genai.Client()` singleton for the whole backend, lazily reading `AI_VISION_API_KEY` on first call (mirrors `auth.py`'s `_get_jwks_client()` shape)
- `backend/services/gemini_service.py` exposes `extract_receipt()`, `extract_statement()`, `generate_insight()` -- every Gemini call goes through the SDK's **async** client (`client.aio.models.generate_content`) inside `asyncio.wait_for`, per RESEARCH.md Pitfall 2, so the 10s/15s hard-timeouts (SCAN-03, AIINS-03) actually work
- Three Pydantic response_schema models (`ReceiptExtraction`, `StatementExtractionList`/`StatementTransaction`, `InsightItem`) match `API_CONTRACT.md`'s exact field shapes and double as Gemini's structured-output contract
- `InsightItem` structurally rejects a response where both `related_goal_id` and `related_category_id` are null (AIINS-02/Pitfall 4), enforced via a Pydantic v2 `@model_validator(mode="after")`
- 18 new unit tests (7 model tests + 11 service tests), all passing, zero live network calls -- full backend suite (97 tests) still green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add google-genai dependency, client factory, and three Pydantic response schemas** - `4f795cc` (feat)
2. **Task 2: Build gemini_service.py with timeout-wrapped extraction/generation functions and mocked unit tests** - `2d0aab4` (feat)

**Plan metadata:** (this commit, docs)

_Note: Task 0 was a `checkpoint:human-verify` gate with no file changes -- it produced no commit of its own, only the user's "verified" confirmation that unblocked Task 1._

## Files Created/Modified
- `backend/requirements.txt` - added `google-genai>=2.10.0`
- `backend/core/gemini_client.py` - `get_gemini_client()` lazy-singleton factory
- `backend/models/receipt.py` - `ReceiptExtraction` Pydantic schema (SCAN-01)
- `backend/models/statement.py` - `StatementTransaction` + `StatementExtractionList` Pydantic schemas (ESTAT-01)
- `backend/models/insight.py` - `InsightItem` Pydantic schema with action_verb enum + cross-field invariant (AIINS-02)
- `backend/tests/test_insight_model.py` - 7 unit tests for the three response schemas (no I/O)
- `backend/services/gemini_service.py` - `extract_receipt()`, `extract_statement()`, `generate_insight()`, all async + timeout-wrapped + no-retry
- `backend/tests/conftest.py` - added `fake_gemini_response` and `spy_wait_for_timeout` fixtures
- `backend/tests/test_gemini_service.py` - 11 unit tests covering all 3 service functions' success/timeout/failure paths and exact timeout-value assertions

## Decisions Made
- **google-genai package legitimacy confirmed by user** (Task 0): PyPI listing links to `github.com/googleapis/python-genai` (official Google org), 108 release history -- matches 03-RESEARCH.md's "Approved with note" conclusion.
- **`STATEMENT_TIMEOUT_SECONDS = 15.0`** for `extract_statement()` -- not locked by any requirement; reuses the AIINS-03 15s constant per RESEARCH.md Open Question #1's own recommendation range (15-20s), defined as a named module constant so it's trivially tunable later.
- **Used `backend/venv`** for the `pip install`, per the plan's explicit Task 1 instruction. Both `backend/venv` and the sibling `/Users/macbookpro/macost/venv` already had `fastapi`/`pydantic` installed independently (neither is a symlink to the other) -- `backend/venv` is the one this project's test convention actually exercises (`python -m pytest` from repo root, anchored by `backend/pytest.ini`).
- **No `pytest-asyncio` added.** `gemini_service.py`'s three functions are `async def`, but rather than adding a new (plan-unlisted) test dependency, `test_gemini_service.py` drives each coroutine via plain `asyncio.run(...)` inside ordinary sync `def test_...` functions. This sidesteps the package-install exclusion in the executor's deviation rules (any new package install -- even an extremely standard one like `pytest-asyncio` -- requires a legitimacy checkpoint per that rule) and needed no new dependency at all.
- **Fixture monkeypatch target corrected to patch-where-used.** The plan's prose said the fixture "monkeypatches `backend.core.gemini_client.get_gemini_client`", but `gemini_service.py` imports that name via `from backend.core.gemini_client import get_gemini_client` -- a direct name binding that survives independently of the origin module's attribute. Patching `backend.core.gemini_client.get_gemini_client` therefore would NOT affect calls made from inside `gemini_service.py`. The fixture instead monkeypatches `backend.services.gemini_service.get_gemini_client` (and, for the timeout spy, `backend.services.gemini_service.asyncio.wait_for`) -- the actual call sites exercised by the code under test. This is standard "patch where used, not where defined" practice and preserves the plan's intent (no live network call, configurable success/exception stub) exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the `fake_gemini_response` fixture's monkeypatch target**
- **Found during:** Task 2 (writing `conftest.py`'s fixture)
- **Issue:** The plan's literal wording pointed at monkeypatching `backend.core.gemini_client.get_gemini_client`, but `gemini_service.py` imports the function by name (`from backend.core.gemini_client import get_gemini_client`), so patching the origin module's attribute would be a no-op for tests -- Gemini calls made from `gemini_service.py` would still resolve to the real (unpatched) function reference bound at import time.
- **Fix:** Fixture monkeypatches `backend.services.gemini_service.get_gemini_client` directly (and `backend.services.gemini_service.asyncio.wait_for` for the timeout-assertion fixture) -- the actual names resolved at the call site.
- **Files modified:** `backend/tests/conftest.py`
- **Verification:** All 11 `test_gemini_service.py` tests pass, confirmed via test assertions (not just returned type) that no real `genai.Client` is ever constructed and the configured stub behavior (success text / timeout / generic exception) is exercised correctly.
- **Committed in:** `2d0aab4` (Task 2 commit)

**2. [Rule 3 - Blocking] Avoided adding pytest-asyncio to run async test functions**
- **Found during:** Task 2 (writing `test_gemini_service.py`)
- **Issue:** `gemini_service.py`'s three functions are `async def`; running them from pytest without `pytest-asyncio` (or an event-loop-managing plugin) would raise `RuntimeWarning: coroutine was never awaited` if called naively.
- **Fix:** Wrapped each async call in `asyncio.run(...)` inside plain sync `def test_...` functions instead of installing a new test-only dependency -- functionally equivalent for this test file's needs, zero new supply-chain surface.
- **Files modified:** `backend/tests/test_gemini_service.py`
- **Verification:** All 11 tests pass; full backend suite (97 tests) still green with no regression.
- **Committed in:** `2d0aab4` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix to make the test fixture actually effective, 1 blocking-issue resolution that avoided an unnecessary new dependency)
**Impact on plan:** Both auto-fixes were necessary for the plan's own stated goal ("no test hits the real Gemini API" / "unit tests exercise all three gemini_service functions") to actually hold true. No scope creep -- no new files or behavior beyond what Task 1/2 specified.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None for this plan. `AI_VISION_API_KEY` provisioning (real Google AI Studio key + Railway env var) is explicitly scoped to 03-02-PLAN.md (Hidayat-only, non-blocking) per this plan's own frontmatter `user_setup` note -- this plan develops and tests entirely against the `fake_gemini_response` mocked client, no real key needed yet.

## Next Phase Readiness
- `backend/services/gemini_service.py`'s three functions (`extract_receipt`, `extract_statement`, `generate_insight`) are ready to be imported directly by 03-05 (receipt scan endpoint), 03-06 (e-statement import endpoint), and 03-07 (AI insight endpoint) with no further scaffolding needed.
- `fake_gemini_response` and `spy_wait_for_timeout` fixtures in `backend/tests/conftest.py` are ready for reuse by those plans' own test files (e.g. `test_statement_service.py`, `test_insight_service.py` per 03-PATTERNS.md).
- Blocker: none. `AI_VISION_API_KEY` real-key provisioning (03-02, Hidayat) is non-blocking for continued development against the mocked client, but IS needed before any of 03-05/03-06/03-07's endpoints can be smoke-tested against the live Gemini API.

---
*Phase: 03-differentiators*
*Completed: 2026-07-09*

## Self-Check: PASSED

All 9 created/modified files confirmed present on disk; both task commit hashes (`4f795cc`, `2d0aab4`) confirmed present in git log. No missing items.
