---
phase: 03-differentiators
plan: 07
subsystem: api+ui
tags: [gemini, ai-insight, saw-engine, react, backend, frontend]

# Dependency graph
requires:
  - phase: 03-differentiators
    provides: "03-01: gemini_service.generate_insight() (async, 15s timeout-wrapped); 03-02: API_CONTRACT.md action_verb/related_category_id contract extension sign-off (required before implementing the extended shape)"
provides:
  - "backend/services/insight_service.py: generate_user_insights() -- aggregates transactions+SAW-ranked goals, delegates to gemini_service.generate_insight"
  - "backend/routers/ai_insight.py: GET /api/ai-insight -- locked success/fallback shapes"
  - "apps/web/app/ai/page.tsx + InsightCard.tsx: wired one-way insight feed with action_verb badges + refresh"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "insight_service.generate_user_insights does NOT add a second timeout wrapper -- trusts 03-01's gemini_service.generate_insight to already enforce the 15s AIINS-03 cap internally"
    - "InsightCard action_verb color map: Alokasikan -> accent orange, Kurangi -> destructive red, Pertimbangkan -> neutral -- extracted from ai/page.tsx's previously-inline markup into a reusable parametrized component"
    - "One-way insight feed only -- no message composer, no conversational input, no tool-calling anywhere on the page (AIAGENT-01/FR-019 explicitly out of scope)"

key-files:
  created:
    - backend/routers/ai_insight.py
    - backend/services/insight_service.py
    - apps/web/components/InsightCard.tsx
  modified:
    - backend/main.py
    - backend/tests/test_insight_service.py
    - apps/web/app/ai/page.tsx
    - apps/web/lib/api/types.ts

key-decisions:
  - "generate_user_insights reuses fetch_and_rank_goals(user_id) from goal_service rather than requerying goals separately -- avoids a second ranking/aggregation implementation"
  - "GET /api/ai-insight always returns promptly with either real insights or the locked fallback shape ({insight_available:false, fallback_message}) -- never a 500, never blocks past the 15s ceiling enforced inside gemini_service"
  - "InsightItem's cross-field model_validator (from 03-01) rejects any Gemini response where both related_goal_id and related_category_id are null before it ever reaches the router as a successful result"

requirements-completed: [AIINS-01, AIINS-02, AIINS-03]

# Metrics
duration: not independently re-measured (executed via Cline, no executor timing captured)
completed: 2026-07-09
---

# Phase 3 Plan 07: AI Financial Insights Summary

**Executed manually via Cline outside `/gsd-execute-phase` (Khayyira/Zarra do not use Claude Code) — this SUMMARY.md was written retroactively on 2026-07-10 after merge, to reconcile GSD tracking with the already-shipped code.**

Wires the already-existing static `/ai` page shell to a real server-side Gemini-backed insight generator: aggregates the user's transactions + SAW-ranked goals, returns 1-4 Bahasa Indonesia insights each carrying a fixed-vocabulary `action_verb` and a link to a goal or category, with a 15s hard server-side timeout and manual refresh -- strictly a one-way feed, never chat.

## Accomplishments

- `backend/services/insight_service.py`'s `generate_user_insights(user_id)`: aggregates the user's recent transactions (bounded window) and SAW-ranked goals via `fetch_and_rank_goals(user_id)`, builds a Bahasa Indonesia prompt (module-level `INSIGHT_PROMPT_TEMPLATE`), and delegates to `gemini_service.generate_insight` -- returns its result verbatim (`list[InsightItem]` or `None`), adding no redundant timeout wrapper.
- `GET /api/ai-insight` (new `backend/routers/ai_insight.py`, registered in `backend/main.py` alongside the existing 6 Phase 2 routers): returns `{"insight_available": true, "insights": [...]}` on success (each insight carrying `action_verb` + one of `related_goal_id`/`related_category_id` non-null, per the 03-02-extended contract), or `{"insight_available": false, "fallback_message": "..."}` (locked copy) on failure/timeout -- never a 500, never an infinite spinner.
- IDOR-safety test confirms the aggregation only ever reads the calling user's own transactions/goals.
- `apps/web/components/InsightCard.tsx`: extracted from the previously-inline "AI Insights Card" markup in `ai/page.tsx`, now a reusable component rendering an action-verb badge (Alokasikan/Kurangi/Pertimbangkan, locked color map) and a chevron routing to the linked goal or category-filtered transactions view.
- `apps/web/app/ai/page.tsx`: wired to `GET /api/ai-insight` on mount and on a "Perbarui insight" manual-refresh click; fallback path shows the locked `fallback_message` + "Buka Goals" CTA; empty-state copy for brand-new users with no data; no input field, message composer, or send button exists anywhere on the page.

## Files Modified

| File | Owner | Half |
|------|-------|------|
| `backend/routers/ai_insight.py` | Fertika | Backend |
| `backend/services/insight_service.py` | Fertika | Backend |
| `backend/main.py` | Fertika | Backend |
| `backend/tests/test_insight_service.py` | Fertika | Backend |
| `apps/web/app/ai/page.tsx` | Khayyira (Cline) | Frontend |
| `apps/web/components/InsightCard.tsx` | Khayyira (Cline) | Frontend |
| `apps/web/lib/api/types.ts` | Khayyira (Cline) | Frontend (shared file, append-only) |

## Task Commits

1. Backend: backend/services/insight_service.py + backend/routers/ai_insight.py (registered in backend/main.py) -- `35b0410`, `8e9ad00`
2. Frontend: apps/web/app/ai/page.tsx wired + InsightCard.tsx -- `67e4c6b`

## Verification

- Backend suite: 123/123 tests passing (full repo, after `google-genai` dependency installed into venv from requirements.txt) -- whole-suite confirmation, not an independently re-measured per-plan count. Confirms the new router registration in `main.py` doesn't break app startup.
- Frontend static export build succeeds, including the `/ai` and `/ai/insights` routes.
- Merged to `main` cleanly via PR (part of the #16-#19 range covering all 4 team branches).

## Decisions Made

- Depended on 03-01 (Gemini integration layer) and 03-02 (API_CONTRACT.md action_verb/related_category_id sign-off) -- the extended insight shape was only implemented after 03-02's team-approved contract change landed, per this plan's explicit `depends_on` sequencing.
- Ran in Wave 2 alongside 03-05 in parallel isolated worktrees; both plans append-only edited `apps/web/lib/api/types.ts` to avoid merge conflicts -- no functional dependency between the two features, only shared-file ownership.

## Deviations from Plan

None documented at reconciliation time -- this SUMMARY.md was written retroactively from the PLAN.md's own specification plus the verified facts already confirmed by the orchestrator (commit hashes, test pass counts, build status). No independent diff review against the plan's exact wording was performed as part of this reconciliation task.

## Self-Check: PASSED

Cited commit hashes (`35b0410`, `8e9ad00`, `67e4c6b`) confirmed present via `git log --oneline --all | grep`. All named key files confirmed present on disk at `main` HEAD: `backend/routers/ai_insight.py`, `backend/services/insight_service.py`, `backend/main.py`, `backend/tests/test_insight_service.py`, `apps/web/app/ai/page.tsx`, `apps/web/components/InsightCard.tsx`, `apps/web/lib/api/types.ts`.
