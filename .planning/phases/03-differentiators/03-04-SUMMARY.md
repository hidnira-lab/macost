---
phase: 03-differentiators
plan: 04
subsystem: api+ui
tags: [saw-engine, goal-settings, react, backend, frontend]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: "saw_engine.rank_goals(), GoalSettingsUpdate ±0.002 tolerance validator, goal_settings_service.DEFAULT_WEIGHTS (all pre-existing from Phase 2)"
provides:
  - "backend/routers/goal_settings.py: POST /api/goal-settings/preview -- candidate-weight re-rank without persistence"
  - "apps/web/components/SawWeightEditor.tsx: 5-criteria live weight editor + reset-to-default"
  - "apps/web/app/goal-settings/page.tsx: page wiring GET/PUT/preview to SawWeightEditor"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preview endpoint reuses saw_engine.rank_goals() with candidate (unsaved) weights instead of a second TypeScript ranking implementation -- backend is the single source of ranking truth"
    - "Frontend DEFAULT_WEIGHTS constant duplicated (not imported) into SawWeightEditor.tsx, mirrored from backend/services/goal_settings_service.py's DEFAULT_WEIGHTS since no cross-language import path exists -- comment notes the two must be kept in sync"

key-files:
  created:
    - apps/web/app/goal-settings/page.tsx
    - apps/web/components/SawWeightEditor.tsx
  modified:
    - backend/routers/goal_settings.py
    - backend/tests/test_goal_settings.py
    - apps/web/lib/api/client.ts
    - apps/web/lib/api/types.ts

key-decisions:
  - "POST /api/goal-settings/preview never persists -- verified by a regression test asserting GET /api/goal-settings is unchanged after a preview call with different candidate weights (T-3-07 mitigation)"
  - "±0.002 sum tolerance enforced both server-side (source of truth, pre-existing Phase 2 validator) and client-side (UX, disables Simpan Bobot button before a round-trip)"

requirements-completed: [SAW-04, SAW-05]

# Metrics
duration: not independently re-measured (executed via Cline, no executor timing captured)
completed: 2026-07-09
---

# Phase 3 Plan 04: SAW Weight Editor + Preview Endpoint Summary

**Executed manually via Cline outside `/gsd-execute-phase` (Khayyira/Zarra do not use Claude Code) — this SUMMARY.md was written retroactively on 2026-07-10 after merge, to reconcile GSD tracking with the already-shipped code.**

Manual SAW weight adjustment with live re-rank preview (backend-computed, no TypeScript reimplementation) and one-click reset to the locked n=62 research defaults.

## Accomplishments

- `POST /api/goal-settings/preview` added to `backend/routers/goal_settings.py`: validates candidate weights with the same ±0.002 tolerance as `PUT /api/goal-settings`, re-ranks the user's goals using `saw_engine.rank_goals()` with the candidate (not stored) weights, and returns the same `{"goals": [...]}` shape as `GET /api/goals` -- never writes to `goal_settings`.
- A SAW-05 regression test locks that `PUT /api/goal-settings` accepts `goal_settings_service.DEFAULT_WEIGHTS` (22.5/21.9/21.5/17.8/16.2%) verbatim, tying the reset button's target values to a verified backend contract.
- `apps/web/components/SawWeightEditor.tsx`: 5 controlled numeric inputs (personal_importance, progress_gap, saving_capacity, urgency, target_amount), debounced (~300ms) live preview calls to the new endpoint, inline sum validation ("Total bobot harus 100%. Saat ini {sum}%."), and a "Reset ke default" text-link with a light inline confirm before restoring the locked defaults.
- `apps/web/app/goal-settings/page.tsx`: seeds the editor from `GET /api/goal-settings` on mount, saves via `PUT /api/goal-settings` only when weights are in-tolerance, keeps the user on the page after save (no forced navigation) per UI-SPEC.md.

## Files Modified

| File | Owner | Half |
|------|-------|------|
| `backend/routers/goal_settings.py` | Fertika | Backend |
| `backend/tests/test_goal_settings.py` | Fertika | Backend |
| `apps/web/app/goal-settings/page.tsx` | Khayyira (Cline) | Frontend |
| `apps/web/components/SawWeightEditor.tsx` | Khayyira (Cline) | Frontend |
| `apps/web/lib/api/client.ts` | Khayyira (Cline) | Frontend (shared file, append-only) |
| `apps/web/lib/api/types.ts` | Khayyira (Cline) | Frontend (shared file, append-only) |

## Task Commits

1. Backend: POST /api/goal-settings/preview endpoint + SAW-05 regression test -- `3e0e5da`
2. Frontend: SawWeightEditor.tsx + apps/web/app/goal-settings/page.tsx -- `1ff4da0`

## Verification

- Backend suite: 123/123 tests passing (full repo, after `google-genai` dependency installed into venv from requirements.txt) -- whole-suite confirmation, not an independently re-measured per-plan count.
- Frontend static export build succeeds, including the `/goal-settings` route.
- Merged to `main` cleanly via PR (part of the #16-#19 range covering all 4 team branches).

## Decisions Made

- Preview endpoint's ranking math is identical to the live `GET /api/goals` path (both call `saw_engine.rank_goals` with the same enrichment step) -- no second scoring implementation exists anywhere, per RESEARCH.md's "Don't Hand-Roll" guidance.
- Frontend `DEFAULT_WEIGHTS` is a duplicated constant (not a cross-language import) since there's no direct import path from TypeScript into `backend/services/goal_settings_service.py` -- flagged in-code as needing to stay in sync with the backend constant.

## Deviations from Plan

None documented at reconciliation time -- this SUMMARY.md was written retroactively from the PLAN.md's own specification plus the verified facts already confirmed by the orchestrator (commit hashes, test pass counts, build status). No independent diff review against the plan's exact wording was performed as part of this reconciliation task.

## Self-Check: PASSED

Both cited commit hashes (`3e0e5da`, `1ff4da0`) confirmed present via `git log --oneline --all | grep`. All named key files confirmed present on disk at `main` HEAD: `backend/routers/goal_settings.py`, `backend/tests/test_goal_settings.py`, `apps/web/app/goal-settings/page.tsx`, `apps/web/components/SawWeightEditor.tsx`, `apps/web/lib/api/client.ts`, `apps/web/lib/api/types.ts`.
