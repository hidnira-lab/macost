# Phase 3: Differentiators - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Macost's five differentiator features that directly target the two validated churn causes (47% input-friction churn, 19% non-actionable-reporting churn):

1. **Receipt scan** (SCAN-01/02/03) — upload a receipt image, AI extracts merchant/nominal/date/items/suggested category, user reviews & corrects before save, graceful fallback on failure/timeout.
2. **E-statement PDF import** (ESTAT-01/02/03) — upload a PDF, extract a transaction list with possible-duplicate flags, user selects which to import, report imported/skipped counts.
3. **AI financial insights** (AIINS-01/02/03) — one-way (non-chat) insights in Bahasa Indonesia, each with an action verb and a link to a goal or category, with a 15s hard-timeout fallback to Goals.
4. **SAW weight customization** (SAW-04/05) — user adjusts the five SAW criteria weights with live re-ranking, and can reset to the n=62 research defaults.
5. **Quick Access Panel** (QAP-01) — exactly 4 shortcuts at the top of Home (add transaction, scan receipt, top active goal name+progress%, balance summary).

HOW to implement is what this phase clarifies; WHAT to build (the 12 requirements above) is fixed by ROADMAP.md and REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Receipt scan — image capture (SCAN-01)
- **D-01:** Image input is **file-upload only** (file picker for JPG/PNG). No webcam/`getUserMedia` capture. Rationale: MVP targets Web + Tauri Desktop only (no mobile), where a live camera is usually absent and webcam UI + permission handling adds build cost the ~5-day timeline can't justify. The success-criteria word "photograph" is satisfied by uploading a photo already on the device. Sends `multipart/form-data` field `image` to `POST /api/transactions/scan-receipt` (contract locked). Extracted data is shown in an editable review form and **never auto-saved** (SCAN-02); on failure or >10s timeout, show the contract's `error_message` fallback and route to manual input (SCAN-03) — no auto-retry.

### E-statement import — duplicate detection & selection (ESTAT-02)
- **D-02:** Backend flags a row as `is_possible_duplicate: true` when its **(`tanggal_transaksi` + `nominal`)** pair matches an existing transaction for that user. In the review UI, **all rows are checkbox-selected by default EXCEPT flagged duplicates (unchecked by default)**; the user can freely toggle any row before confirming. After batch import, report `imported_count` / `skipped_count` (ESTAT-03, contract locked). Description-similarity matching was considered and deferred as unnecessary for MVP.

### AI insights — contract shape (AIINS-02)
- **D-03:** **Extend the `GET /api/ai-insight` contract** to add per-insight `action_verb` (enum: `Alokasikan` | `Kurangi` | `Pertimbangkan`) and `related_category_id` (nullable, alongside the existing nullable `related_goal_id`). This is required to satisfy AIINS-02 structurally ("action verb + link to a goal OR category"). **⚠ MANDATORY FOLLOW-UP:** this changes `API_CONTRACT.md`, which per project rules MUST be communicated to and agreed by all 4 team members BEFORE implementation. Planner/executor must treat the contract update + team sign-off as a prerequisite task, not silently alter the shape. See `<deferred>` → Required Follow-Ups.

### AI insights — generation timing (AIINS-01/03)
- **D-04:** Insights are generated **on-demand when the `/ai` page is opened** (server-side LLM call), plus a **manual "Perbarui insight" refresh button**. Enforce the **15s hard timeout server-side** (not just frontend) → on timeout/failure return `insight_available: false` with `fallback_message` routing the user to Goals (AIINS-03, contract locked). Caching last results was considered but rejected in favor of always-fresh insights for the demo.

### SAW weight editor & validation (SAW-04/05)
- **D-05:** The weight editor uses **manual numeric entry for the five criteria** with a **live goal re-rank preview** and a **"Reset ke default" button** restoring the n=62 research weights (SAW-05). Sum validation uses a **±0.002 tolerance** (NOT the ±0.001 written in SAW-04), because the locked research defaults sum to 0.999 and would fail a ±0.001 check. This matches the previously-recorded project decision on SAW weight tolerance. **⚠ MANDATORY FOLLOW-UP:** update the SAW-04 text in `.planning/REQUIREMENTS.md` from `±0.001` to `±0.002` so requirement and validator agree. See `<deferred>` → Required Follow-Ups.

### Quick Access Panel (QAP-01)
- **D-06:** QAP is a **new component placed at the top of the existing `apps/web/app/home/page.tsx`** (already wired to real APIs), reusing the data the Home page already fetches (dashboard + goals) rather than adding new endpoints. Exactly **4 shortcuts, each one-tap**: (1) add transaction, (2) scan receipt, (3) top active goal — name + progress %, using the SAW rank-1 goal, (4) balance summary. Keep it clean/uncrowded with large thumb-reachable targets (per PRD Final). Exact visual layout is Figma-driven.

### Claude's Discretion
- Component/file structure for the receipt review form, e-statement review table, AI insight cards, SAW editor, and QAP component.
- Exact Bahasa Indonesia copy for fallback messages, toasts, and empty/error states (match existing tone).
- Backend service structure for the Gemini vision/PDF extraction and the insight generator (follow the existing `routers/` + `services/` split; `saw_engine.py` already exists for re-rank preview).
- Precise Figma-driven layouts for all five features — request the relevant frame link per page during implementation (per CLAUDE.md UI workflow).
- Whether e-statement duplicate matching is scoped to same-wallet or all-wallets (implementation heuristic detail beyond the D-02 tanggal+nominal rule).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API contract (locked shapes — do NOT deviate without team-wide discussion)
- `API_CONTRACT.md` §`POST /api/transactions/scan-receipt` (lines ~190-217) — multipart `image`; success vs `extracted:false` fallback shapes; Gemini implementation note.
- `API_CONTRACT.md` §`POST /api/transactions/upload-statement` (lines ~221-240) — multipart `file` (PDF); `extracted_transactions[]` with `temp_id`, `is_possible_duplicate`, `suggested_category_id`.
- `API_CONTRACT.md` §`GET/PUT /api/goal-settings` (lines ~315-345) — `strategy` + `weights`; weight-sum validation rule (note the ±0.002 tolerance decision in D-05).
- `API_CONTRACT.md` §`GET /api/ai-insight` (lines ~443-472) — current `insight_available` / `insights[]` / `fallback_message` shape. **This is the shape D-03 proposes to EXTEND — read the current shape, then apply the agreed contract change.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — SCAN-01..03, ESTAT-01..03, AIINS-01..03, SAW-04/05, QAP-01 (note SAW-04 text needs the ±0.001→±0.002 update per D-05). AIAGENT-01 (interactive AI chatbot) is EXPLICITLY post-MVP (Phase 999.2) — do NOT build it.
- `.planning/ROADMAP.md` §Phase 3: Differentiators — goal, 5 success criteria, key risks. NOTE: the "AI/vision provider not yet selected (GPT-4o vs Google Cloud Vision)" risk is **STALE** — provider is locked to Gemini 2.5 Flash (see business rules below).

### Business rules & AI config (locked, from CLAUDE.md)
- `CLAUDE.md` / `.claude/CLAUDE.md` — AI Vision provider = **Google AI Studio Gemini `gemini-2.5-flash`** (free tier, dummy expo data), key `AI_VISION_API_KEY` in `backend/.env`; dual-path: extract then fall back to manual, **no auto-retry**. AI Financial Assistant = one-way insight (NOT chat), Bahasa Indonesia, 15s fallback. SAW weights (n=62): personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2%; Smart Allocation always suggest-and-confirm.
- `docs/PANDUAN_TEKNIKAL_TIM.md` §2a — platform-ownership scoping flow (env vars / dashboard settings are Hidayat-only; others mock first).

### Design source of truth
- Figma (per CLAUDE.md "Sumber Desain UI") — request the relevant frame link before building any receipt-review, e-statement-review, AI-insight, SAW-settings, or QAP UI. Do not build from text description alone.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/app/ai/page.tsx` — **already exists as a static shell** (113 lines, hardcoded, `lucide-react` icons, no API wiring). Wire it to `GET /api/ai-insight` rather than building from scratch; it establishes the page chrome/header pattern.
- `apps/web/app/home/page.tsx` — **396 lines, already wired to real APIs** (dashboard, goals, transactions, categories via `apiFetch`). QAP (D-06) mounts on top and reuses these existing fetches.
- `backend/routers/goal_settings.py` + `backend/services/goal_settings_service.py` — already implement get-or-create-default and `DEFAULT_WEIGHTS`; SAW-04/05 extend these (add weight-write validation with ±0.002 tolerance + reset), not greenfield.
- `backend/services/saw_engine.py` — existing SAW ranking engine; the live re-rank preview (D-05) calls it with candidate weights.
- `backend/routers/transactions.py` — existing transactions router; `scan-receipt` and `upload-statement` endpoints attach here as new multipart routes.
- `apps/web/lib/api/client.ts` — established `USE_MOCK` + `apiFetch`/`apiMutate` split; new scan/e-statement/insight/settings calls follow it.
- `apps/web/mocks/*.json` — existing mock pattern; add scan-receipt / upload-statement / ai-insight mocks so frontend can proceed before Hidayat wires `AI_VISION_API_KEY`.
- `backend/dependencies/auth.py` — JWKS JWT dependency; reuse for all new Phase 3 endpoints.

### Established Patterns
- Source/type labeling stays server-side from category `flag_pemasukan` — scan & e-statement produce `suggested_category_id`, and the backend still derives `tipe_transaksi`/`source_label` on save (never sent by frontend).
- Mock-first frontend dev (Phase 1/2 pattern) — decouples web work from the Gemini key setup.
- Suggest-and-confirm / never auto-execute — extends to "never auto-save extracted data" (SCAN-02) and "user selects before batch import" (ESTAT-02).

### Integration Points
- **Platform ownership:** `AI_VISION_API_KEY` is a NEW env var on Railway/Supabase → **Hidayat-scoped setup task**, sequenced separately so it does not block Fertika (backend logic against a placeholder key) or Zarra/Khayyira (web against mocks). Per CLAUDE.md platform-ownership rule + `docs/PANDUAN_TEKNIKAL_TIM.md` §2a.
- New Home QAP consumes existing `apps/web/lib/auth/session.ts` `getToken()` and the Home page's existing dashboard/goals responses.
- SAW editor's re-rank preview integrates with the existing `GET /api/goals` (ranked) + `saw_engine.py`.

</code_context>

<specifics>
## Specific Ideas

- AI insight action verbs are a fixed vocabulary: **Alokasikan / Kurangi / Pertimbangkan** (from AIINS-02 / success criteria).
- LLM fallback routes the user to the **Goals page**; vision fallback routes to **manual input** — these targets are specified, not Claude's choice.
- Otherwise no bespoke visual references — Figma frames are the source of truth, requested per page during implementation.

</specifics>

<deferred>
## Deferred Ideas

### ⚠ Required Follow-Ups (prerequisites for execution — not scope creep, but must happen)
- **API contract extension (D-03):** add `action_verb` + `related_category_id` to `GET /api/ai-insight` in `API_CONTRACT.md`, communicated to and agreed by all 4 team members BEFORE the insight feature is implemented. This is a hard project rule (contract changes require team-wide sign-off).
- **Requirement text fix (D-05):** update SAW-04 in `.planning/REQUIREMENTS.md` from `±0.001` to `±0.002` so the requirement matches the validator tolerance and the locked 0.999-sum research defaults.

### Out-of-scope ideas (future phases)
- Webcam/live-camera receipt capture — deferred (D-01 chose upload-only for MVP); revisit if mobile (Phase 999.1) returns.
- Description-similarity duplicate detection for e-statements — deferred (D-02 uses tanggal+nominal only).
- Insight caching / scheduled regeneration — deferred (D-04 chose on-demand + manual refresh).
- Interactive AI agent chatbot (AIAGENT-01 / FR-019) — explicitly post-MVP, ROADMAP Phase 999.2. Do NOT build.

</deferred>

---

*Phase: 3-Differentiators*
*Context gathered: 2026-07-09*
