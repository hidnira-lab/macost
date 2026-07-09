# Phase 3: Differentiators - Research

**Researched:** 2026-07-09
**Domain:** Gemini 2.5 Flash multimodal extraction (image + PDF) behind FastAPI multipart uploads, server-side hard-timeout LLM calls, and additive Next.js/FastAPI feature work reusing an established codebase pattern set
**Confidence:** MEDIUM-HIGH (stack choices HIGH; exact Gemini SDK call shapes MEDIUM — some fetched doc excerpts contained hallucinated method names, corrected against the primary GitHub source; see Pitfall 1)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Receipt scan input):** File-upload only (file picker for JPG/PNG). No webcam/`getUserMedia`. `multipart/form-data` field `image` to `POST /api/transactions/scan-receipt` (contract locked). Extracted data shown in an editable review form, **never auto-saved** (SCAN-02). On failure or >10s timeout, show the contract's `error_message` fallback and route to manual input (SCAN-03) — **no auto-retry**.
- **D-02 (E-statement duplicate detection):** Backend flags `is_possible_duplicate: true` when (`tanggal_transaksi` + `nominal`) matches an existing transaction for that user. Review UI: all rows checked by default **EXCEPT** flagged duplicates (unchecked by default); user can freely toggle. After batch import, report `imported_count` / `skipped_count` (ESTAT-03, contract locked). Description-similarity matching deferred as unnecessary for MVP.
- **D-03 (AI insights contract shape):** Extend `GET /api/ai-insight` to add per-insight `action_verb` (enum: `Alokasikan` | `Kurangi` | `Pertimbangkan`) and `related_category_id` (nullable, alongside existing nullable `related_goal_id`). **⚠ MANDATORY FOLLOW-UP:** This changes `API_CONTRACT.md` — requires sign-off from all 4 team members BEFORE implementation. Treat as a prerequisite task, not silently altered.
- **D-04 (AI insights generation timing):** Generated **on-demand when `/ai` page opens** (server-side LLM call) + manual "Perbarui insight" refresh button. Enforce **15s hard timeout server-side** (not just frontend) → on timeout/failure return `insight_available: false` with `fallback_message` routing to Goals (AIINS-03, contract locked). No caching — always-fresh insights.
- **D-05 (SAW weight editor & validation):** Manual numeric entry for the five criteria, live goal re-rank preview, "Reset ke default" button restoring n=62 research weights (SAW-05). Sum validation uses **±0.002 tolerance** (NOT ±0.001 in SAW-04 text — locked defaults sum to 0.999). **⚠ MANDATORY FOLLOW-UP:** update SAW-04 text in `.planning/REQUIREMENTS.md` from `±0.001` to `±0.002`.
- **D-06 (Quick Access Panel):** New component at top of existing `apps/web/app/home/page.tsx`, reuses existing dashboard/goals fetches, no new endpoints. Exactly **4 shortcuts**: (1) add transaction, (2) scan receipt, (3) top active goal (name + progress %, SAW rank-1), (4) balance summary.

### Claude's Discretion

- Component/file structure for the receipt review form, e-statement review table, AI insight cards, SAW editor, and QAP component.
- Exact Bahasa Indonesia copy for fallback messages, toasts, and empty/error states (match existing tone) — though the UI-SPEC.md already locks most of this verbatim; treat UI-SPEC copy as the source of truth, not a re-derivation point.
- Backend service structure for the Gemini vision/PDF extraction and the insight generator (follow the existing `routers/` + `services/` split; `saw_engine.py` already exists for re-rank preview).
- Precise Figma-driven layouts for all five features — request the relevant frame link per page during implementation.
- Whether e-statement duplicate matching is scoped to same-wallet or all-wallets (implementation heuristic detail beyond the D-02 tanggal+nominal rule).

### Deferred Ideas (OUT OF SCOPE)

- Webcam/live-camera receipt capture — deferred (D-01); revisit only if mobile (Phase 999.1) returns.
- Description-similarity duplicate detection for e-statements — deferred (D-02 uses tanggal+nominal only).
- Insight caching / scheduled regeneration — deferred (D-04 chose on-demand + manual refresh).
- Interactive AI agent chatbot (AIAGENT-01 / FR-019) — explicitly post-MVP, ROADMAP Phase 999.2. Do NOT build.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-01 | Upload receipt photo; AI extracts merchant, nominal, tanggal, item, suggested_category_id via vision | Gemini 2.5 Flash multimodal image input pattern (Code Examples §1), FastAPI multipart upload validation (Pitfall 3), structured JSON output via `response_schema` (Code Examples §3) |
| SCAN-02 | Review/correct extraction before save; never auto-save | Existing Phase 2 transaction-form + suggest-and-confirm pattern extends directly — no new research needed, reuse `TransactionCreate` flow |
| SCAN-03 | Fallback on failure/timeout >10s, route to manual, no auto-retry | Server-side hard-timeout pattern (Code Examples §4, Pitfall 2) |
| ESTAT-01 | Upload PDF e-statement; extract transaction list with tanggal, deskripsi, nominal, tipe, suggested_category_id | Gemini 2.5 Flash native PDF understanding via Files API or inline bytes (Code Examples §2), FastAPI PDF multipart handling (Pitfall 3) |
| ESTAT-02 | Review extracted transactions, flag possible duplicates, confirm before batch import | D-02 duplicate-detection SQL query pattern (Code Examples §5); reuses `POST /api/transactions/import-batch` (already in API_CONTRACT.md) |
| ESTAT-03 | Report imported_count/skipped_count after batch import | Straightforward aggregation over `import-batch` results — no new research needed |
| AIINS-01 | One-way insight in Bahasa Indonesia from transaction/goal data | Gemini 2.5 Flash text generation from aggregated financial data (Code Examples §6) |
| AIINS-02 | Each insight has action_verb + link to goal or category | Contract extension already drafted in `03-CONTRACT-CHANGE-PROPOSAL.md`; structured JSON output enum constraint (Code Examples §3) |
| AIINS-03 | 15s hard timeout fallback to Goals | `asyncio.wait_for` pattern + critical caveat about blocking SDK calls (Pitfall 2) |
| SAW-04 | Manual weight adjustment, ±0.002 tolerance validation | Already implemented in `backend/models/goal_settings.py` — this phase only needs a live re-rank preview endpoint/pattern (Architecture Patterns §3) |
| SAW-05 | Reset to n=62 default weights | `DEFAULT_WEIGHTS` already exists in `goal_settings_service.py` — pure frontend wiring |
| QAP-01 | 4-shortcut panel on Home, reuses existing fetches | No new research needed — pure frontend composition over already-fetched `dashboard` + `goals` data |
</phase_requirements>

## Summary

Phase 3's genuinely new technical ground is narrow and well-scoped: integrating Google's `google-genai` Python SDK (NOT the deprecated `google-generativeai` package) into the existing FastAPI backend for two multimodal extraction endpoints (receipt image, e-statement PDF) and one text-generation endpoint (AI insight), all sharing the same underlying pattern — call Gemini 2.5 Flash with `response_mime_type: "application/json"` + a Pydantic `response_schema`, and get back a validated JSON object matching the target shape. Everything else in this phase (review UI, batch import, SAW editor, QAP) is straightforward composition over already-shipped Phase 1/2 backend and frontend patterns.

The two hazards worth real engineering care are: (1) `google-genai`'s synchronous client method (`client.models.generate_content`) is a **blocking** network call — calling it directly inside an `async def` FastAPI route handler blocks the event loop for the full LLM round-trip, which defeats both the 10s (scan) and 15s (insight) hard-timeout requirements, since `asyncio.wait_for` cannot interrupt a blocking call already running on the event loop thread; and (2) FastAPI's `UploadFile` needs explicit size/type/magic-number validation before handing bytes to Gemini — nothing in FastAPI or Gemini enforces "this really is a JPG under 10MB" for you. Both hazards have a single, low-risk fix: use the SDK's async client (`client.aio.models.generate_content`, `await`-able) wrapped in `asyncio.wait_for(..., timeout=N)`, or alternatively run the sync client inside `asyncio.to_thread(...)` if the async client proves unstable in testing.

**Primary recommendation:** Add `google-genai>=2.10.0` to `backend/requirements.txt`, build a single shared `backend/services/gemini_service.py` module exposing `extract_receipt()`, `extract_statement()`, and `generate_insight()`, each using `client.aio.models.generate_content(...)` wrapped in `asyncio.wait_for()` with the SCAN-03/AIINS-03 timeouts, structured output via Pydantic `response_schema`, and the existing dual-path extract-then-manual-fallback / no-auto-retry pattern already established in `API_CONTRACT.md`'s prose.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Receipt image upload UI (file picker, review form) | Browser / Client (Next.js) | — | Pure UI; file never processed client-side |
| Receipt image → structured extraction | API / Backend (FastAPI) | External (Gemini 2.5 Flash) | Vision AI call must stay server-side — API key lives in `backend/.env`, never exposed to the browser |
| E-statement PDF upload UI (file picker, review table) | Browser / Client (Next.js) | — | Pure UI |
| PDF → transaction list extraction | API / Backend (FastAPI) | External (Gemini 2.5 Flash) | Same reasoning — server-side API key, and PDF parsing/AI call is compute-heavy, doesn't belong in a static-export browser bundle |
| Duplicate detection (tanggal+nominal match) | API / Backend (FastAPI) | Database (Supabase/Postgres) | Requires querying the user's existing `transaksi` rows — must be server-side for correctness and to avoid leaking other users' data |
| Batch import confirm/select UI | Browser / Client (Next.js) | — | Pure UI over already-fetched extraction result |
| AI insight generation | API / Backend (FastAPI) | External (Gemini 2.5 Flash), Database (Supabase) | Must aggregate the user's transaction/goal data server-side then call the LLM — cannot run in browser (API key + data aggregation) |
| AI insight display + refresh trigger | Browser / Client (Next.js) | — | Pure UI; refresh just re-calls `GET /api/ai-insight` |
| SAW weight validation (sum tolerance) | API / Backend (FastAPI) | — | Already implemented server-side in `GoalSettingsUpdate` Pydantic validator — do not duplicate in frontend beyond a UX pre-check |
| SAW live re-rank preview | Browser / Client (Next.js) | API / Backend (candidate weights → `GET /api/goals`-shaped ranking) | Preview should call the backend with candidate weights (reusing `saw_engine.rank_goals`) rather than reimplementing SAW math in TypeScript — avoids drift between two ranking implementations |
| Quick Access Panel (QAP) | Browser / Client (Next.js) | — | Pure composition over already-fetched `dashboard`/`goals` data on the Home page; no new endpoint |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-genai` | 2.10.0 (verified via `pip index versions`, released 2026-06-24) [VERIFIED: pypi registry] | Official Google Gen AI Python SDK — multimodal (image/PDF) input, structured JSON output, sync + async clients | This is Google's current officially-maintained SDK for Gemini API access (`googleapis/python-genai` on GitHub); the older `google-generativeai` package is deprecated/legacy per Google's own migration guidance [CITED: github.com/googleapis/python-genai] |
| `python-multipart` | already in `backend/requirements.txt` (>=0.0.32) [VERIFIED: codebase grep] | Parses `multipart/form-data` bodies for FastAPI `UploadFile` | Already a project dependency — no new install needed for the upload mechanics themselves |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic` | already in `backend/requirements.txt` (>=2.13.0) | Defines `response_schema` for Gemini structured output + validates the parsed JSON | Already the project's model layer — reuse directly for `ReceiptExtraction`, `StatementTransaction`, `InsightItem` schemas |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-genai` (native Gemini PDF understanding) | A separate PDF-text-extraction library (`pypdf`, `pdfplumber`) feeding extracted text into Gemini as a text prompt | CLAUDE.md locks Gemini 2.5 Flash for this feature and Gemini's Files/inline-PDF API natively ingests PDFs (up to 1000 pages, ~258 tokens/page) with full layout understanding [CITED: ai.google.dev/gemini-api/docs/document-processing] — a separate text-extraction step would lose table/layout structure that bank statements rely on and adds an unnecessary dependency. Not recommended unless Gemini's native PDF path proves unreliable in testing. |
| `client.aio.models.generate_content` (async SDK client) | `asyncio.to_thread(client.models.generate_content, ...)` wrapping the sync client | Both achieve non-blocking behavior. The async client is the SDK's documented native async path; `asyncio.to_thread` is a safe fallback if the async client shows instability (see `AsyncClient.__del__` unawaited-task issue in Sources) — pick whichever proves more stable in Phase 3's own smoke testing, document the choice in a plan Task. |
| Google AI Studio API key (`AI_VISION_API_KEY`, free tier) | Vertex AI with service-account auth | CLAUDE.md explicitly locks the AI Studio free-tier key approach for MVP/demo purposes (dummy data, not user-real). Do not switch to Vertex AI without an explicit decision — it changes the auth model entirely (project/location/service-account vs a single API key). |

**Installation:**
```bash
# from backend/, inside the existing venv
pip install "google-genai>=2.10.0"
# then add to backend/requirements.txt:
# google-genai>=2.10.0
```

**Version verification:** `google-genai` confirmed on PyPI via `pip index versions google-genai` → latest `2.10.0`, published 2026-06-24 [VERIFIED: pypi registry]. Minimum Python 3.10 — project runs 3.12, compatible. `python-multipart` and `pydantic` versions already pinned and present in the codebase; no re-verification needed.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `google-genai` | PyPI | Package line active since 2024 (v0.x), current major line 2.x began well before this check; automated heuristic flagged `too-new`/`unknown-downloads` because it only inspected the *latest patch release's* publish timestamp (2026-06-24) and PyPI's download-count field was empty in this check | Not resolved by seam (weeklyDownloads: null) — independently known to be a very high-traffic package as Google's official SDK, confirmed by `github.com/googleapis/python-genai` being the canonical repo under the `googleapis` GitHub org | `github.com/googleapis/python-genai` (official Google org) | `SUS` (seam) → **reclassified OK on manual review** | **Approved with note** — flagged `SUS` purely by the "too-new" heuristic misreading a routine version bump as package age; the repo is Google's own official SDK, actively maintained, matches the package name used throughout official Gemini API docs. Planner should still add a `checkpoint:human-verify` task before `pip install` per protocol, but this is a due-diligence formality, not a genuine legitimacy concern. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `google-genai` (see note above — false positive from the age heuristic; verify at install time that `pip show google-genai` reports `Home-page: https://github.com/googleapis/python-genai` before proceeding, as an extra sanity check beyond this research).

*No other new packages are needed this phase — `python-multipart` and `pydantic` are already installed. If a PDF-text-extraction fallback library becomes necessary during implementation (see Alternatives Considered), it must go through this same legitimacy gate before being added.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser / Tauri WebView (apps/web, static export)                    │
│                                                                        │
│  [Scan Receipt page]  [Upload Statement page]  [/ai page]  [Home+QAP]│
│  [SAW Settings page]                                                  │
└───────────┬──────────────────┬──────────────────┬─────────┬─────────┘
            │ multipart/       │ multipart/         │ GET     │ GET (existing
            │ form-data(image) │ form-data(file)     │         │ dashboard/goals)
            ▼                  ▼                    ▼         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FastAPI Backend (backend/, Railway)                                  │
│                                                                        │
│  POST /transactions/scan-receipt        POST /transactions/          │
│  ┌──────────────────────────┐           upload-statement             │
│  │ 1. Validate UploadFile    │           ┌──────────────────────────┐│
│  │    (size/type/magic #)    │           │ 1. Validate UploadFile   ││
│  │ 2. asyncio.wait_for(      │           │    (PDF magic # %PDF)    ││
│  │      gemini_extract_recipt│           │ 2. asyncio.wait_for(     ││
│  │      timeout=10)          │           │      gemini_extract_stmt,││
│  │ 3. On success: return     │           │      timeout=~15-20*)    ││
│  │    {extracted:true, ...}  │           │ 3. Query existing        ││
│  │ 4. On timeout/fail: return│           │    transaksi rows for    ││
│  │    {extracted:false,      │           │    (tanggal,nominal)     ││
│  │     error_message}        │           │    duplicate match       ││
│  │    — NO auto-retry        │           │ 4. Return                ││
│  └──────────────┬────────────┘           │    extracted_transactions││
│                 │                        │    [] with flags          ││
│                 │                        └──────────────┬────────────┘│
│                 ▼                                        │            │
│  GET /ai-insight                                          │            │
│  ┌──────────────────────────┐                             │            │
│  │ 1. Aggregate user's       │                             │            │
│  │    transactions + goals   │                             │            │
│  │    from Supabase          │                             │            │
│  │ 2. asyncio.wait_for(      │                             │            │
│  │      gemini_generate_     │                             │            │
│  │      insight, timeout=15) │                             │            │
│  │ 3. On success: insights[] │                             │            │
│  │    w/ action_verb + link  │                             │            │
│  │ 4. On timeout/fail:       │                             │            │
│  │    insight_available:     │                             │            │
│  │    false + fallback_msg   │                             │            │
│  └──────────────┬────────────┘                             │            │
│                 │                                          │            │
│                 ▼                                          ▼            │
│         backend/services/gemini_service.py (shared module)              │
│         client.aio.models.generate_content(                            │
│           model="gemini-2.5-flash",                                    │
│           contents=[...],                                              │
│           config={response_mime_type: json, response_schema: Pydantic} │
│         )                                                               │
└──────────────────────────┬────────────────────────────────────────────┘
                            │ HTTPS (AI_VISION_API_KEY)
                            ▼
                 ┌───────────────────────┐
                 │ Google AI Studio       │
                 │ Gemini 2.5 Flash API   │
                 │ (free tier)            │
                 └───────────────────────┘

* Statement timeout is not explicitly locked by CONTEXT.md (only scan=10s,
  insight=15s are). Planner must pick and document a value — recommend
  reusing the 15s insight timeout as a reasonable default unless the team
  specifies otherwise, since e-statement PDFs can be multi-page and slower
  to process than a single receipt image.
```

### Recommended Project Structure

```
backend/
├── services/
│   ├── gemini_service.py       # NEW — shared Gemini client init + 3 extraction/generation functions
│   ├── statement_service.py    # NEW — duplicate-detection query + batch-import orchestration (ESTAT-02/03)
│   ├── insight_service.py      # NEW — aggregates transactions/goals into an LLM prompt (AIINS-01)
│   ├── saw_engine.py           # EXISTING — reused as-is for live re-rank preview
│   └── goal_settings_service.py # EXISTING — DEFAULT_WEIGHTS reused for SAW-05 reset
├── routers/
│   ├── transactions.py         # EXTEND — add scan-receipt, upload-statement, import-batch routes
│   ├── ai_insight.py           # NEW — GET /api/ai-insight
│   └── goal_settings.py        # EXTEND (maybe) — add a re-rank-preview helper endpoint if not reusing GET /api/goals directly
├── models/
│   ├── receipt.py              # NEW — ReceiptExtraction Pydantic schema (Gemini response_schema)
│   ├── statement.py            # NEW — StatementTransaction Pydantic schema
│   └── insight.py              # NEW — InsightItem Pydantic schema (action_verb enum, related_*)
└── core/
    └── gemini_client.py        # NEW — single genai.Client() instance, reads AI_VISION_API_KEY

apps/web/
├── app/
│   ├── transactions/scan/page.tsx      # NEW — receipt scan upload + review form
│   ├── transactions/import/page.tsx    # NEW — e-statement upload + review table
│   ├── ai/page.tsx                     # EXISTING shell — wire to GET /api/ai-insight
│   ├── goal-settings/page.tsx          # NEW (or extend existing goals settings surface) — SAW weight editor
│   └── home/page.tsx                   # EXTEND — mount QuickAccessPanel at top
├── components/
│   ├── QuickAccessPanel.tsx            # NEW
│   ├── ReceiptReviewForm.tsx           # NEW
│   ├── StatementReviewTable.tsx        # NEW
│   ├── InsightCard.tsx                 # NEW
│   └── SawWeightEditor.tsx             # NEW
└── mocks/
    ├── scan-receipt.json               # NEW
    ├── upload-statement.json           # NEW
    └── ai-insight.json                 # NEW (extended shape per D-03)
```

### Pattern 1: Gemini structured extraction with a Pydantic response_schema

**What:** Call `generate_content` with `contents` containing both the file bytes (`types.Part.from_bytes`) and a text instruction, and a `config` dict specifying `response_mime_type: "application/json"` and `response_schema` set to a Pydantic model — Gemini then constrains its output to match that schema, and the SDK/your code parses it back into the same model.

**When to use:** Both SCAN-01 (receipt image → merchant/nominal/tanggal/items/suggested_category_id) and ESTAT-01 (PDF → list of transactions).

**Example:**
```python
# Source: github.com/googleapis/python-genai README (verified against source,
# 2026-07-09) — model id corrected to gemini-2.5-flash per CLAUDE.md lock;
# some fetched doc mirrors showed a nonexistent "gemini-3.5-flash" — see
# Pitfall 1 for why that must NOT be used.
from google import genai
from google.genai import types
from pydantic import BaseModel

class ReceiptExtraction(BaseModel):
    merchant: str
    nominal: int
    tanggal_transaksi: str  # ISO 8601 date string
    items: list[str] | None = None
    suggested_category_id: str | None = None

client = genai.Client(api_key=AI_VISION_API_KEY)

response = await client.aio.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        "Ekstrak data struk ini: merchant, nominal total, tanggal transaksi, "
        "daftar item (opsional). Balas dalam JSON sesuai schema.",
        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
    ],
    config={
        "response_mime_type": "application/json",
        "response_schema": ReceiptExtraction,
    },
)
extraction = ReceiptExtraction.model_validate_json(response.text)
```

### Pattern 2: Server-side hard timeout around a blocking-risk LLM call

**What:** Wrap the Gemini call in `asyncio.wait_for(..., timeout=N)` using the SDK's **async** client method so the wrapped coroutine can actually be cancelled if it overruns — NOT the sync client, which cannot be interrupted by `asyncio.wait_for` once it starts running (see Pitfall 2).

**When to use:** SCAN-03 (10s), AIINS-03 (15s), and the not-explicitly-locked e-statement timeout.

**Example:**
```python
# Source: pattern synthesized from asyncio.wait_for documentation + SDK's
# documented .aio async client property [CITED: docs.python.org/3/library/asyncio-task.html#asyncio.wait_for]
import asyncio

async def extract_receipt(image_bytes: bytes, mime_type: str) -> ReceiptExtraction | None:
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[PROMPT, types.Part.from_bytes(data=image_bytes, mime_type=mime_type)],
                config={"response_mime_type": "application/json", "response_schema": ReceiptExtraction},
            ),
            timeout=10.0,
        )
    except (asyncio.TimeoutError, Exception):
        # Broad except intentional here: any Gemini-side failure (timeout,
        # malformed response, API error, rate limit) must fall through to
        # the SAME manual-input fallback path per D-01 — no auto-retry, no
        # differentiated error handling that could accidentally retry.
        return None
    return ReceiptExtraction.model_validate_json(response.text)
```

### Pattern 3: SAW live re-rank preview without duplicating ranking logic

**What:** Rather than reimplementing SAW scoring in TypeScript for the "live preview" (SAW-04/05), have the frontend send candidate weights to a backend endpoint (or reuse an existing one) that calls the already-tested `saw_engine.rank_goals(goals, candidate_weights, strategy)` and returns the re-ranked list.

**When to use:** SAW weight editor's live preview as the user types new numeric weights.

**Example:**
```python
# NEW backend/routers/goal_settings.py addition (illustrative — planner
# decides exact route name/shape)
@router.post("/goal-settings/preview")
def preview_rank(
    body: GoalSettingsUpdate,  # reuses existing model + ±0.002 validator
    current_user_id: str = Depends(get_current_user_id),
):
    goals = fetch_and_prepare_goals(current_user_id)  # same prep as GET /api/goals
    ranked = rank_goals(goals, body.weights.model_dump(), body.strategy)
    return {"goals": ranked}
```
This avoids a second, drift-prone SAW implementation in the frontend — consistent with the codebase's existing "backend is single source of truth for ranking" pattern (`backend/services/saw_engine.py` docstring).

### Anti-Patterns to Avoid

- **Calling the sync Gemini client inside an `async def` route without `asyncio.to_thread` or the async client:** blocks the entire event loop for the LLM round-trip, silently defeating the 10s/15s hard-timeout requirements and freezing all other concurrent requests on that worker (see Pitfall 2).
- **Retrying a failed/timed-out Gemini call automatically:** explicitly forbidden by CLAUDE.md ("JANGAN retry otomatis") and D-01/D-04 — a caught exception must go straight to the fallback response, never a second attempt.
- **Reading `UploadFile.content_type` as the sole file-type gate:** it is client-supplied and trivially spoofable; combine with a magic-number check (Pitfall 3).
- **Auto-saving extracted receipt/statement data:** violates SCAN-02/ESTAT-02 and the project's core suggest-and-confirm principle — extraction results are always staged for user review, never written to `transaksi` directly from the extraction endpoint.
- **Reimplementing SAW scoring math in the frontend for the "live preview":** creates two ranking implementations that will drift; call the backend with candidate weights instead (Pattern 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured JSON extraction from an image/PDF | Custom regex/heuristic parsing of a free-text Gemini response | `response_schema` (Pydantic) + `response_mime_type: "application/json"` in the `generate_content` config | Gemini's structured-output mode constrains the model's output at generation time — far more reliable than post-hoc parsing of free text, and gets you a validated Pydantic object for free [CITED: ai.google.dev/gemini-api/docs/structured-output] |
| PDF table/text extraction for the e-statement | A separate PDF-parsing library (`pdfplumber`, `PyPDF2`) plus manual table-reconstruction heuristics | Gemini 2.5 Flash's native PDF document understanding (send the PDF bytes directly as a `Part`) | Gemini natively ingests PDFs with layout/table understanding up to 1000 pages [CITED: ai.google.dev/gemini-api/docs/document-processing] — a bank e-statement's tabular structure is exactly the kind of content a naive text-extraction library mangles (column misalignment, multi-line rows) |
| SAW re-ranking for the live preview | A parallel TypeScript port of `saw_engine.py`'s scoring math | Call a backend endpoint that invokes the existing `rank_goals()` with candidate weights | Two implementations of the same weighted-scoring algorithm will inevitably drift (rounding, tie-break order, strategy multipliers) — the backend one is already tested (see `backend/tests/test_saw_engine.py`) |
| File-size/type validation for uploads | Trusting `Content-Length` header or `UploadFile.content_type` alone | Explicit `await file.read()` + `len(content)` check, plus a magic-number sniff (`b"\xff\xd8\xff"` JPEG, `b"\x89PNG\r\n\x1a\n"` PNG, `b"%PDF"` PDF) before handing bytes to Gemini | Both the `Content-Length` header and `content_type` are client-supplied and can be wrong or spoofed; a malformed/oversized upload should fail fast with a clear 400, not reach the (paid-tier-adjacent, rate-limited) Gemini call at all |

**Key insight:** Every "hand-roll" temptation in this phase (custom text parsing, a second SAW implementation, trusting client-supplied file metadata) has a direct, already-available replacement either in the Gemini SDK's structured-output feature or in this codebase's own existing `saw_engine.py`. The phase's real engineering work is orchestration (timeouts, validation, fallback wiring), not algorithm-building.

## Common Pitfalls

### Pitfall 1: Hallucinated Gemini SDK method names in AI-generated/fetched documentation summaries

**What goes wrong:** Several web-fetched documentation summaries during this research session returned code using `client.interactions.create(model="gemini-3.5-flash", input=[...])` — neither `client.interactions` nor a model called `gemini-3.5-flash` exist in the real SDK. This appears to be a fetch-tool/LLM-summarization artifact, not real documentation content.

**Why it happens:** Automated web-content summarization tools can pattern-match against similar-looking APIs (e.g., OpenAI's `client.responses.create` or `client.chat.completions.create` shape) and hallucinate a plausible-but-wrong Google SDK equivalent, especially for a fast-moving SDK with frequent version bumps.

**How to avoid:** Use `client.models.generate_content(model="gemini-2.5-flash", contents=[...])` (sync) or `await client.aio.models.generate_content(...)` (async) — confirmed verbatim against the primary source, `github.com/googleapis/python-genai`'s own README, in this research session [VERIFIED: github.com/googleapis/python-genai README, fetched 2026-07-09]. The model id is locked to `gemini-2.5-flash` per CLAUDE.md — never substitute a different Gemini version number seen in a secondary source.

**Warning signs:** Any code sample referencing `client.interactions`, `client.responses`, or a `gemini-3.x` model name should be treated as unverified and cross-checked against `github.com/googleapis/python-genai` before use.

### Pitfall 2: `asyncio.wait_for` does not cancel a blocking synchronous call

**What goes wrong:** If the Gemini call is made via the **sync** client (`client.models.generate_content(...)`) directly inside an `async def` route handler (even if wrapped in `asyncio.wait_for`), the underlying HTTP request blocks the single event-loop thread. `asyncio.wait_for`'s timeout only fires between `await` points — a synchronous call with no `await` inside it cannot be pre-empted, so the "timeout" will only apply *after* the blocking call finally returns (or never, if it hangs), not at the intended 10s/15s mark. This has been a widely-reported FastAPI gotcha [CITED: github.com/fastapi/fastapi/issues/5881, github.com/fastapi/fastapi/discussions/6066].

**Why it happens:** FastAPI/Starlette are built on asyncio, but a plain function call to a synchronous HTTP client library performs blocking I/O with no cooperative yield points for the event loop to interrupt.

**How to avoid:** Use the SDK's async client (`client.aio.models.generate_content(...)`, itself `await`-able) inside `asyncio.wait_for()`. If the async client proves unstable (there is a known but non-blocking `AsyncClient.__del__` unawaited-task cleanup issue [CITED: github.com/googleapis/python-genai/issues/1709] — cosmetic, does not affect correctness), fall back to `await asyncio.to_thread(client.models.generate_content, ...)` wrapped in `asyncio.wait_for`, which runs the sync call in a worker thread where it CAN be abandoned (the thread keeps running in the background but the coroutine awaiting it is properly cancelled/timed-out from the route handler's perspective).

**Warning signs:** In manual testing, the endpoint takes noticeably longer than the configured timeout to return an error, or a single hung Gemini request appears to freeze unrelated concurrent requests to the same backend process.

### Pitfall 3: Trusting client-supplied file metadata for upload validation

**What goes wrong:** Relying solely on `UploadFile.content_type` (an HTTP header set by the browser/client) or the `Content-Length` header to gate file type/size lets a malicious or malformed upload (e.g., a renamed `.exe` with `Content-Type: image/jpeg`, or a 200MB "receipt") reach the Gemini call, wasting quota/cost and potentially hitting undefined SDK behavior.

**Why it happens:** `content_type` is entirely client-controlled and easy to spoof; some HTTP clients omit `Content-Length` for streamed multipart bodies.

**How to avoid:** After `await file.read()`, check `len(content)` against an explicit max (e.g., reject receipts over ~10MB, PDFs over 50MB per Gemini's documented PDF limit), and sniff the first few bytes against known magic numbers (`b"\xff\xd8\xff"` JPEG, `b"\x89PNG\r\n\x1a\n"` PNG, `b"%PDF"` PDF) before constructing the Gemini `Part` [CITED: multiple FastAPI file-upload guides, cross-referenced against magic-number byte sequences which are stable file-format constants].

**Warning signs:** Gemini API errors mentioning unsupported MIME type, or unexpectedly large request payloads/latency on the scan-receipt or upload-statement endpoints.

### Pitfall 4: Insight `related_goal_id`/`related_category_id` invariant silently violated

**What goes wrong:** The D-03 contract extension requires "minimal salah satu dari `related_goal_id` / `related_category_id` terisi (tidak boleh keduanya null)" (`03-CONTRACT-CHANGE-PROPOSAL.md`). If the LLM's structured output schema doesn't enforce this at generation time, Gemini could return an insight with both fields null, breaking AIINS-02's "link to a goal or category" requirement.

**Why it happens:** Pydantic's `response_schema` constrains field *types* (string, null, enum) but not cross-field invariants like "at least one of X/Y must be non-null" — Gemini's structured output honors the JSON Schema shape, not arbitrary Python validators.

**How to avoid:** Add a `model_validator` (Pydantic v2, `mode="after"`) on the `InsightItem` schema that raises if both `related_goal_id` and `related_category_id` are null, and treat that as an extraction failure (same fallback path as a timeout) rather than silently returning a linkless insight card.

**Warning signs:** Insight cards rendering with no chevron/link target in the UI (UI-SPEC.md explicitly calls out this as a valid-but-degenerate case — "if both are null the card shows no chevron" — meaning the UI will render it, but it violates AIINS-02's requirement and should be caught server-side instead).

### Pitfall 5: E-statement duplicate-detection scoping ambiguity (same-wallet vs all-wallets)

**What goes wrong:** D-02 only specifies the match key ((`tanggal_transaksi` + `nominal`)), not whether the existing-transaction query should be scoped to the wallet the statement is being imported into, or across all of the user's wallets. An unscoped-to-wallet query could flag a legitimate transaction as a duplicate just because another wallet happened to have the same date+amount coincidentally (e.g., two separate Rp 50,000 transactions on the same day in different wallets).

**Why it happens:** CONTEXT.md explicitly leaves this as "Claude's Discretion" — it's a genuine open implementation choice, not an oversight.

**How to avoid:** Default to scoping the duplicate check to `id_pengguna` only (not wallet-scoped) unless a specific wallet selector exists in the upload flow, since `API_CONTRACT.md`'s `upload-statement` request doesn't include a `dompet_id` at extraction time (only at final `import-batch` time, per each transaction's shape) — meaning the wallet isn't even known until after the user reviews and the batch-import happens. Document this choice explicitly in the plan.

**Warning signs:** User confusion/bug reports about "why is this flagged as duplicate, I've never entered this before" — investigate whether it's a same-date/same-amount coincidence across wallets.

## Runtime State Inventory

> This section is included per protocol trigger review, but Phase 3 is additive (new endpoints, new pages, no renames/migrations of existing entities). No renamed/refactored identifiers exist in this phase.

**Nothing found in this category** — Phase 3 introduces new capabilities (scan-receipt, upload-statement, ai-insight, goal-settings weight editing UI, QAP) without renaming any existing table, column, env var, or registered OS/service state. Verified by: (1) `API_CONTRACT.md` diff is purely additive (new endpoints + one field-additive extension to an existing response shape, not a rename); (2) `goal_settings` table/weights keys are untouched — SAW-04/05 only adds a UI editor over the already-existing `PUT /api/goal-settings` endpoint; (3) no filesystem/package/task-scheduler renames are implicated by any of the 12 requirement IDs in scope.

One item requiring a genuinely new runtime registration, not a rename: `AI_VISION_API_KEY` must be added as a **new** environment variable on Railway (backend) — this is Hidayat-scoped per the platform-ownership rule (CLAUDE.md, `docs/PANDUAN_TEKNIKAL_TIM.md` §2a) and must not block Fertika's backend logic (develop against a placeholder/mock key first) or Zarra/Khayyira's frontend work (mock-first, per established Phase 1/2 pattern).

## Common Pitfalls (Environment)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `client.aio.models.generate_content` is the correct async method path (vs. some other async entry point) | Code Examples §1-2, Pattern 2 | If the SDK's async surface differs slightly (e.g., a different property name in a future minor version), the async-wrapping pattern needs adjustment, but the core mitigation (don't block the event loop) still holds — low risk, verify with a quick smoke test in the first implementation task |
| A2 | E-statement extraction timeout should default to ~15s (reusing the insight timeout) since CONTEXT.md doesn't lock a specific value for ESTAT-01 | System Architecture Diagram footnote, Pitfall 5 sibling context | If the team wants a different explicit timeout for statement parsing (e.g., 20-30s for multi-page PDFs), the plan should surface this as an open question rather than silently picking 15s — low risk since it's a tunable constant, not a structural decision |
| A3 | Gemini 2.5 Flash's PDF understanding (native ingestion) is preferable to a separate text-extraction library for e-statement parsing | Alternatives Considered, Don't Hand-Roll | If Gemini's native PDF table/layout understanding proves unreliable for real Indonesian bank statement formats during testing, a fallback text-extraction library may be needed — should be validated with a real sample e-statement PDF early in implementation, not assumed to "just work" |
| A4 | `google-genai`'s `SUS` legitimacy verdict is a false positive from the age-detection heuristic, not a genuine risk signal | Package Legitimacy Audit | If this reasoning is wrong (e.g., there actually was a supply-chain compromise around the 2026-06-24 release), installing without deeper verification would be a real risk — mitigated by the recommended `pip show google-genai` homepage-URL sanity check plus the mandatory `checkpoint:human-verify` task the planner must still insert |

**If this table is empty:** N/A — see entries above; all four are LOW-to-MEDIUM risk operational/tuning assumptions, not core architectural claims.

## Open Questions

1. **Exact e-statement (ESTAT-01) server-side timeout value**
   - What we know: SCAN-03 locks 10s, AIINS-03 locks 15s. ESTAT has no explicit timeout requirement text in REQUIREMENTS.md or CONTEXT.md.
   - What's unclear: Whether the team wants a distinct (likely longer, given multi-page PDFs) timeout for statement parsing, or intends the same 10s/15s pattern to apply.
   - Recommendation: Planner should pick an explicit value (recommend 15-20s) and document it as a task-level decision, flagging it for confirmation rather than silently baking it in as if it were a locked contract value.

2. **AI_VISION_API_KEY provisioning sequencing**
   - What we know: This is a Hidayat-scoped platform task (Railway env var) per CLAUDE.md/PANDUAN_TEKNIKAL_TIM.md §2a, and must not block other team members.
   - What's unclear: Exact timing of when Hidayat will provision the real key vs. when Fertika needs to start backend implementation.
   - Recommendation: Plan should sequence a Hidayat-only task (add `AI_VISION_API_KEY` to Railway + `backend/.env.example`) in parallel with a placeholder/mock-key backend development path, mirroring the established Phase 2 pattern for Vercel/Railway/Supabase env vars.

3. **API contract sign-off timing for D-03's `action_verb`/`related_category_id` addition**
   - What we know: CONTEXT.md explicitly flags this as a MANDATORY prerequisite requiring all 4 team members' sign-off before AI insight implementation proceeds.
   - What's unclear: Whether this sign-off has already happened by plan-execution time, or needs to be a literal blocking task in the plan.
   - Recommendation: Planner should insert an explicit prerequisite task/checkpoint for contract sign-off before any AIINS-02-related implementation task, not assume it's already resolved.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 (backend venv) | All Phase 3 backend work | ✓ | 3.12 (confirmed via existing bytecode cache) | — |
| `google-genai` package | Gemini extraction/insight services | ✗ (not yet installed) | latest 2.10.0 on PyPI | Install via `pip install "google-genai>=2.10.0"`, no viable fallback — this is the CLAUDE.md-locked provider |
| `AI_VISION_API_KEY` (real Gemini API key) | All 3 Gemini-backed endpoints | ✗ (Hidayat-scoped, not yet provisioned per this research session) | — | Backend development proceeds against a placeholder env var; frontend proceeds against mocks (`apps/web/mocks/scan-receipt.json` etc.) until the real key lands |
| `python-multipart` | Multipart file upload parsing | ✓ | >=0.0.32 (already in requirements.txt) | — |
| Node.js / npm (frontend) | New Phase 3 pages/components | ✓ | Node >=20 per CLAUDE.md | — |
| Test framework (backend) | Automated verification of new services | ✓ | pytest >=8.0.0, existing `backend/tests/` + `conftest.py` fixtures | — |
| Test framework (frontend) | Automated verification of new components | ✗ | none configured in `apps/web/package.json` | No frontend test framework exists; new component testing will be manual/UAT-only unless a Wave 0 gap task adds one (see Validation Architecture below) |

**Missing dependencies with no fallback:**
- `AI_VISION_API_KEY` real value — blocks live end-to-end testing of all 3 Gemini endpoints until Hidayat provisions it, but does not block backend logic development against a placeholder.

**Missing dependencies with fallback:**
- `google-genai` package — not yet installed but trivially installable, no blocker.
- Frontend test framework — absent, but this phase can proceed with manual/UAT verification consistent with how Phase 1/2 shipped (no frontend test framework has existed at any point in this project).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest >=8.0.0 (backend only — confirmed live in `backend/pytest.ini`, `backend/tests/`) |
| Config file | `backend/pytest.ini` (`testpaths = backend/tests`) |
| Quick run command | `python -m pytest backend/tests/test_<new_file>.py -x` (run from repo root — bare `pytest` breaks imports per STATE.md's recorded pitfall) |
| Full suite command | `python -m pytest backend/tests/` (from repo root) |

No frontend test framework exists (`apps/web/package.json` has no test script, no jest/vitest config detected). Frontend verification for this phase continues the project's established manual/UAT pattern (per `human_verify_mode: end-of-phase` in `.planning/config.json`).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | Successful extraction returns expected shape from a mocked Gemini response | unit | `pytest backend/tests/test_gemini_service.py::test_extract_receipt_success -x` | ❌ Wave 0 |
| SCAN-03 | Timeout/failure returns `extracted:false` + `error_message`, no retry attempted | unit | `pytest backend/tests/test_gemini_service.py::test_extract_receipt_timeout -x` | ❌ Wave 0 |
| ESTAT-01 | PDF extraction returns `extracted_transactions[]` shape | unit | `pytest backend/tests/test_gemini_service.py::test_extract_statement_success -x` | ❌ Wave 0 |
| ESTAT-02 | Duplicate flag set correctly for (tanggal+nominal) match | unit | `pytest backend/tests/test_statement_service.py::test_duplicate_detection -x` | ❌ Wave 0 |
| ESTAT-03 | Batch import reports correct imported_count/skipped_count | unit | `pytest backend/tests/test_transactions.py::test_import_batch_counts -x` (extends existing file) | ❌ Wave 0 (new test in existing file) |
| AIINS-02 | Insight schema rejects both `related_*` null | unit | `pytest backend/tests/test_insight_service.py::test_related_invariant -x` | ❌ Wave 0 |
| AIINS-03 | 15s timeout returns `insight_available:false` + `fallback_message` | unit | `pytest backend/tests/test_insight_service.py::test_insight_timeout -x` | ❌ Wave 0 |
| SAW-04 | ±0.002 tolerance already covered | unit | `pytest backend/tests/test_goal_settings.py -x` (existing, passes today) | ✅ existing |
| SAW-05 | Reset restores exact DEFAULT_WEIGHTS | unit | extend `backend/tests/test_goal_settings.py` | ✅ file exists, add case |
| QAP-01 | Manual/UAT only — pure frontend composition | manual | N/A | — |
| SCAN-02 | Manual/UAT — review-before-save UI flow | manual | N/A | — |

### Sampling Rate

- **Per task commit:** targeted `pytest backend/tests/test_<changed_file>.py -x`
- **Per wave merge:** `python -m pytest backend/tests/` (full backend suite, from repo root)
- **Phase gate:** Full suite green before `/gsd-verify-work`; all mocked-Gemini unit tests must not make live API calls (mock `client.aio.models.generate_content` at the test boundary, consistent with `FakeSupabaseClient`'s existing mocking philosophy in `conftest.py`).

### Wave 0 Gaps

- [ ] `backend/tests/test_gemini_service.py` — covers SCAN-01, SCAN-03, ESTAT-01, and a shared "Gemini call mocking" fixture pattern (new `conftest.py` fixture, e.g. `fake_gemini_response`)
- [ ] `backend/tests/test_statement_service.py` — covers ESTAT-02 duplicate detection
- [ ] `backend/tests/test_insight_service.py` — covers AIINS-02 (related_* invariant) and AIINS-03 (timeout)
- [ ] Framework install: none needed — pytest already configured; only new test files needed
- [ ] New `conftest.py` fixture: a fake/mock Gemini client double (mirroring the existing `FakeSupabaseClient` pattern) so unit tests never call the real Gemini API

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWKS-based `get_current_user_id` dependency (`backend/dependencies/auth.py`) — reuse verbatim on all 3 new endpoints (scan-receipt, upload-statement, ai-insight), same as every other Phase 2 endpoint |
| V3 Session Management | no (new surface) | No new session concept introduced; relies on existing Supabase JWT bearer tokens |
| V4 Access Control | yes | Duplicate-detection query and insight aggregation MUST scope to `id_pengguna` (IDOR pattern already established in `transactions.py`'s `list_transactions`/`update_transaction` — double `.eq()` on user + resource id) |
| V5 Input Validation | yes | File upload validation (Pitfall 3): size limits, MIME/magic-number checks before Gemini call; Pydantic `response_schema` for LLM output validation |
| V6 Cryptography | no | No new cryptographic operations introduced this phase |
| V10 Malicious Code / SSRF | yes (new — file processing) | Uploaded file bytes are sent only to Gemini's API (not fetched from a user-supplied URL) — no SSRF vector introduced. Ensure the extraction prompt does not interpolate unsanitized user-controlled URLs if a future iteration adds "import from link" |
| V12 Files and Resources | yes | Explicit max file size checks (receipt ~10MB, PDF up to Gemini's documented 50MB limit) prevent unbounded memory use from `await file.read()`; reject before processing, not after |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-user data leak via duplicate-detection query or insight aggregation missing `id_pengguna` scope | Information Disclosure | Always scope Supabase queries with `.eq("id_pengguna", current_user_id)` — established codebase convention, verified present in every existing router (`transactions.py`, `goals.py`) |
| Oversized/malicious file upload causing memory exhaustion or excessive Gemini API cost | Denial of Service | Explicit size cap + magic-number validation before the Gemini call (Pitfall 3) |
| LLM prompt injection via malicious receipt/PDF content attempting to manipulate the extraction schema output | Tampering | `response_schema` (Pydantic) constrains Gemini's output shape at the API level regardless of prompt-injection attempts in the image/PDF content — a manipulated image cannot make Gemini emit fields outside the schema; still validate the parsed result (e.g., `nominal > 0`) server-side before returning it to the frontend, same as `TransactionCreate`'s existing `Field(gt=0)` pattern |
| API key leakage (`AI_VISION_API_KEY`) via error messages or client-side exposure | Information Disclosure | Key lives only in `backend/.env` / Railway env vars, never sent to the frontend; ensure exception handlers around Gemini calls don't leak the raw SDK error (which may echo request details) directly into the `error_message` field returned to the client — log server-side, return the generic Bahasa Indonesia fallback copy from UI-SPEC.md instead |

## Code Examples

### Gemini structured extraction (image)
```python
# Source: github.com/googleapis/python-genai README, verified 2026-07-09
from google import genai
from google.genai import types

response = await client.aio.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        prompt_text,
        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
    ],
    config={"response_mime_type": "application/json", "response_schema": ReceiptExtraction},
)
```

### Gemini structured extraction (PDF)
```python
# Source: ai.google.dev/gemini-api/docs/document-processing (pattern),
# method names verified against github.com/googleapis/python-genai README
response = await client.aio.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        prompt_text,
        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
    ],
    config={"response_mime_type": "application/json", "response_schema": StatementExtractionList},
)
```

### FastAPI multipart upload with size/type guard
```python
# Source: synthesized from FastAPI file-upload best-practice guides + magic
# number byte constants (stable file-format signatures)
from fastapi import UploadFile, File, HTTPException

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

@router.post("/transactions/scan-receipt")
async def scan_receipt(image: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    content = await image.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(400, detail={"error": {"code": "VALIDATION_ERROR", "message": "File terlalu besar"}})
    if not (content.startswith(JPEG_MAGIC) or content.startswith(PNG_MAGIC)):
        raise HTTPException(400, detail={"error": {"code": "VALIDATION_ERROR", "message": "Format file tidak didukung"}})
    # proceed to Gemini extraction
```

### Server-side hard timeout with graceful fallback
```python
import asyncio

async def extract_receipt_or_none(content: bytes, mime_type: str) -> ReceiptExtraction | None:
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[RECEIPT_PROMPT, types.Part.from_bytes(data=content, mime_type=mime_type)],
                config={"response_mime_type": "application/json", "response_schema": ReceiptExtraction},
            ),
            timeout=10.0,
        )
        return ReceiptExtraction.model_validate_json(response.text)
    except Exception:
        return None  # caller returns {"extracted": false, "error_message": "..."} — no retry
```

### Duplicate-detection query (D-02)
```python
# Illustrative — exact Supabase query shape depends on chosen scoping
# (Pitfall 5: recommend id_pengguna-only, not wallet-scoped)
existing = (
    supabase.table("transaksi")
    .select("tanggal_transaksi,nominal")
    .eq("id_pengguna", current_user_id)
    .execute()
    .data
)
existing_keys = {(row["tanggal_transaksi"], row["nominal"]) for row in existing}

for tx in extracted_transactions:
    tx["is_possible_duplicate"] = (tx["tanggal_transaksi"], tx["nominal"]) in existing_keys
```

### Insight schema with cross-field invariant (Pitfall 4 mitigation)
```python
from pydantic import BaseModel, model_validator
from typing import Literal

class InsightItem(BaseModel):
    id: str
    message: str
    action_verb: Literal["Alokasikan", "Kurangi", "Pertimbangkan"]
    related_goal_id: str | None = None
    related_category_id: str | None = None
    generated_at: str

    @model_validator(mode="after")
    def require_one_related_target(self):
        if self.related_goal_id is None and self.related_category_id is None:
            raise ValueError("insight must link to a goal or category")
        return self
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `google-generativeai` package (legacy Gemini Python SDK) | `google-genai` package (unified Gen AI SDK, supports both Gemini Developer API and Vertex AI) | Google's SDK consolidation, `google-genai` is the actively-developed successor | Do not install `google-generativeai` — it is not the CLAUDE.md-referenced current SDK; use `google-genai` exclusively |
| Free-text LLM output parsed with regex | `response_schema` structured output (Pydantic-typed) | Standard practice for any production LLM-extraction pipeline as of the current Gemini API generation | Directly enables SCAN-01/ESTAT-01's exact field-shape requirements with far less brittle parsing code |

**Deprecated/outdated:**
- `google-generativeai`: superseded by `google-genai` for new integrations — do not use, even though older tutorials/StackOverflow answers may still reference it.

## Sources

### Primary (HIGH confidence)
- `github.com/googleapis/python-genai` README (fetched and verified verbatim 2026-07-09) — confirmed `client.models.generate_content(model='gemini-2.5-flash', contents=...)`, `client.aio` async property, `types.Part.from_bytes(...)`, `response_mime_type`/`response_json_schema` config pattern
- `pip index versions google-genai` (executed 2026-07-09) — confirmed latest version 2.10.0 on PyPI [VERIFIED: pypi registry]
- Existing codebase: `backend/services/saw_engine.py`, `backend/models/goal_settings.py`, `backend/routers/transactions.py`, `backend/tests/conftest.py`, `API_CONTRACT.md`, `.planning/phases/03-differentiators/03-UI-SPEC.md`, `03-CONTEXT.md`, `03-CONTRACT-CHANGE-PROPOSAL.md` (all read directly, 2026-07-09)

### Secondary (MEDIUM confidence)
- `ai.google.dev/gemini-api/docs/document-processing` (WebFetch summary) — PDF ingestion limits (50MB/1000 pages, ~258 tokens/page), Files API vs inline-bytes tradeoff
- `ai.google.dev/gemini-api/docs/structured-output` (WebFetch summary, method names cross-checked/corrected against primary source) — `response_schema` structured-output pattern
- `github.com/fastapi/fastapi/issues/5881` and `discussions/6066` (WebFetch summary) — `asyncio.wait_for` + blocking-call gotcha in FastAPI
- `github.com/googleapis/python-genai/issues/1709` (WebSearch summary) — async client cleanup cosmetic issue
- Various FastAPI file-upload best-practice guides (WebSearch aggregate) — size/magic-number validation pattern

### Tertiary (LOW confidence — flagged, not used as-is)
- WebFetch summaries of `ai.google.dev/gemini-api/docs/image-understanding` and a secondary fetch of the GitHub README both returned a hallucinated `client.interactions.create(model="gemini-3.5-flash", ...)` pattern — explicitly identified as incorrect and excluded from all Code Examples in this document (see Pitfall 1). Recorded here only as a documented caution for future research sessions on this same topic.

## Metadata

**Confidence breakdown:**
- Standard stack (`google-genai` package choice/version): HIGH — verified via PyPI registry query and cross-checked against the SDK's own GitHub README
- Gemini SDK exact call signatures: MEDIUM — core pattern (`client.models.generate_content` / `.aio` async variant / `Part.from_bytes` / `response_schema`) verified against primary source, but this is a fast-moving SDK and exact `config` dict key names (`response_schema` vs `response_json_schema` naming varied across fetched sources) should be smoke-tested against the actually-installed 2.10.0 version early in implementation
- FastAPI timeout/upload patterns: HIGH — these are stable, well-documented FastAPI/Starlette/asyncio mechanics, not tied to a fast-moving SDK
- Architecture/reuse patterns (SAW preview, QAP, existing endpoint extension): HIGH — grounded directly in already-shipped, tested codebase code
- Security domain: HIGH — directly extends already-established, tested IDOR/scoping patterns already present in the codebase

**Research date:** 2026-07-09
**Valid until:** 2026-08-08 (30 days) for architecture/FastAPI patterns; **7 days** specifically for exact Gemini SDK call signatures given the fast release cadence observed (2.10.0 released within the current month) — re-verify `config` dict key names against the installed package version before finalizing implementation.
