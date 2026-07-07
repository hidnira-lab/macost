---
phase: 02-core-product-loop
plan: quick-260706-jaq
subsystem: ui
tags: [figma, design-tokens, ui-spec, documentation, inter, bricolage-grotesque]

# Dependency graph
requires:
  - phase: 02-core-product-loop
    provides: 02-UI-SPEC.md draft (approved 2026-07-05, dark-theme placeholder tokens)
provides:
  - Figma-sourced light-theme design tokens (color, typography, spacing/radii) in 02-UI-SPEC.md
  - Figma file/page/frame node-ID reference map for all 11 extracted Phase 2 frames
  - Per-area visual-layout summaries (Dashboard, Transactions, Goals, Allocation modal) sourced from Figma
  - Explicit "Open Questions / Flagged Discrepancies" section documenting 5 unresolved Figma-vs-spec conflicts
affects: [02-core-product-loop execution plans for Dashboard, Transactions, Goals, Allocation UI; any future dark-theme-to-light-theme retrofit of apps/web wallets/goals/auth pages]

# Tech tracking
tech-stack:
  added: []
  patterns: ["OLD/stale-theme vs target-theme dual-table documentation pattern (preserves old reference while marking new source of truth)"]

key-files:
  created: []
  modified:
    - .planning/phases/02-core-product-loop/02-UI-SPEC.md

key-decisions:
  - "Figma is confirmed source of truth for Phase 2 visual design (2026-07-06); design is light theme, not dark theme as previously assumed"
  - "Retrofitting existing dark-themed apps/web pages (wallets/goals/auth) to the new light theme is out of scope for this update — separate follow-up task"
  - "5 Figma-vs-spec discrepancies (Dashboard KPI order, SAW default weights, Create First Goal vs D-06 empty state, Pending Suggestions scope, Transaction History nav labeling) are surfaced as explicitly unresolved, not silently decided"
  - "SAW default weights remain the canonical CLAUDE.md/survey-n=62 values; Figma's rounder mockup placeholder weights (25/20/20/15/20) are NOT adopted as real defaults"

requirements-completed: [TRAN-01, DASH-01, DASH-02, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, SAW-03, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04]

coverage:
  - id: D1
    description: "Design System/Typography/Color/Spacing sections updated with real Figma light-theme tokens (Inter, Bricolage Grotesque, #fcfcfc background, accent/destructive hex values) plus a Theme Resolution callout"
    verification:
      - kind: other
        ref: "grep -c 'Bricolage Grotesque'/'fcfcfc'/'Theme Resolution' on 02-UI-SPEC.md (all >0, verified during execution)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Figma Gap placeholder replaced with file/page/frame-ID reference map (11 frames) and per-area visual-layout detail for Dashboard, Transactions, Goals, Allocation modal"
    verification:
      - kind: other
        ref: "grep -c for all 11 frame node-IDs plus file key vKQLNfdx7yKSzWvxhmkhg5 on 02-UI-SPEC.md (all >0, verified during execution)"
        status: pass
    human_judgment: false
  - id: D3
    description: "5 Figma-vs-spec discrepancies documented as an explicit unresolved Open Questions section, plus an addendum note under Checker Sign-Off"
    verification:
      - kind: other
        ref: "grep -c 'Open Questions / Flagged Discrepancies'/'156:1646'/'156:1438' on 02-UI-SPEC.md (all >0, verified during execution)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Existing locked contracts (Interaction & State Contracts, Copywriting Contract, Checker Sign-Off checkboxes) preserved verbatim, only additive changes"
    verification:
      - kind: other
        ref: "git diff ca98230..HEAD -- 02-UI-SPEC.md: only 20 removed lines, all within Design System intro/font row/typography weight note/color tables/Figma Gap section — none in Interaction & State Contracts, Copywriting Contract, or Checker Sign-Off checkboxes"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-07-06
status: complete
---

# Phase 2 Quick Task 260706-jaq: Update 02-UI-SPEC.md dengan detail visual Figma Summary

**Replaced 02-UI-SPEC.md's guessed dark-theme placeholder tokens and "Figma Gap" section with real Figma-extracted light-theme design tokens, an 11-frame node-ID reference map, and an explicit unresolved discrepancies section — while preserving every previously-locked interaction/state/copy/timing contract verbatim.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-06T00:00:00Z (approx, pre-dispatch commit ca98230 as baseline)
- **Completed:** 2026-07-06
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Design System, Typography, Color, and Spacing Scale sections now document the real Figma light-theme tokens (Inter + Bricolage Grotesque ExtraBold fonts, `#fcfcfc` background, accent orange/blue, destructive hex values, component-level radii/heights) alongside a clearly labeled "Theme Resolution (2026-07-06)" callout, with the old dark-theme tables retained as explicitly marked OLD/stale reference (not deleted, so the currently-built pages still have a documented baseline).
- The former "Figma Gap" placeholder section (which told the executor to go request Figma frame links before building layout) is now "Figma Reference — Frame Map & Visual Detail" — containing the Figma file key, page node, a complete per-area frame node-ID map for all 11 extracted frames, plus per-area visual-layout summaries for Dashboard, Transactions, Goals, and the Allocation modal, sourced from FIGMA-CONTEXT.md's per-frame findings.
- Added a new "Open Questions / Flagged Discrepancies (Post-Figma-Extraction, 2026-07-06)" section listing all 5 Figma-vs-spec conflicts (Dashboard KPI order, SAW default weights, Create First Goal vs D-06 empty state, Pending Suggestions scope mismatch, Transaction History nav labeling) as explicitly unresolved — plus an addendum note under Checker Sign-Off referencing this update without altering the existing approval/checkbox lines.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace guessed dark-theme design tokens with real Figma-sourced tokens + theme resolution note** - `b8ff368` (docs)
2. **Task 2: Replace "Figma Gap" placeholder with real per-area visual detail and the frame node-ID reference map** - `f6f83d5` (docs)
3. **Task 3: Add the 5 flagged discrepancies as an explicit unresolved "Open Questions" section** - `0a30379` (docs)

**Plan metadata:** committed separately by the orchestrator (this executor does not commit STATE.md/SUMMARY.md per constraints).

## Files Created/Modified
- `.planning/phases/02-core-product-loop/02-UI-SPEC.md` - Design System/Typography/Color/Spacing sections updated with Figma light-theme tokens; "Figma Gap" replaced with "Figma Reference — Frame Map & Visual Detail"; new "Open Questions / Flagged Discrepancies" section added before Checker Sign-Off; addendum note added under Checker Sign-Off heading.

## Decisions Made
- Figma (file `vKQLNfdx7yKSzWvxhmkhg5`, page `156:2`) is confirmed source of truth for Phase 2 visual design as of 2026-07-06 — supersedes the dark-theme assumption previously documented from the hand-built `wallets`/`login`/`register` pages.
- Retrofitting the existing dark-themed `apps/web` pages to the new light theme is explicitly out of scope for this update; flagged as a separate follow-up task for the team.
- SAW default weights remain the canonical CLAUDE.md/survey-n=62 values (22.5/21.9/21.5/17.8/16.2) — the Figma mockup's rounder placeholder weights (25/20/20/15/20) are documented as illustrative only, not adopted as real defaults, per CLAUDE.md Aturan Penting #3.
- All 5 Figma-vs-spec discrepancies are surfaced as unresolved rather than silently decided one way or the other, per the plan's explicit instruction and this task's must-haves.

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks completed per their `<action>` and `<done>` criteria; all `<verify>` grep checks passed on first or second attempt (one Edit required a retry due to a markdown table-separator character mismatch against the live file content, not a plan deviation — same intended text landed once the exact source text was matched).

## Issues Encountered
- One `Edit` call for the Color section initially failed because the plan's assumed table-separator formatting (`|------|------|-------|`) didn't exactly match the live file's actual separator (`|------|-------|-------|`). Resolved by re-reading the exact byte content via a Python script and retrying with the matching string — no content or scope impact, purely a string-matching mechanic.

## User Setup Required

None - no external service configuration required. This is a documentation-only change.

## Next Phase Readiness
- `02-UI-SPEC.md` is now ready to guide Phase 2 execution plans for Dashboard, Transactions, Goals, and Allocation modal UI with real Figma-sourced visual detail instead of guessed dark-theme placeholders.
- **Blocker/concern carried forward:** the 5 items in "Open Questions / Flagged Discrepancies" are NOT resolved by this update and require a team decision before the affected areas (Dashboard KPI order, SAW Prioritization Settings screen, Goals empty-state, Allocation/Pending Suggestions scope, Transaction History navigation) are executed. Recommend routing these to the team before starting the corresponding Phase 2 execution plans.
- **Follow-up task needed (separate, out of scope here):** retrofit `apps/web`'s existing dark-themed `wallets`, `goals`, and `(auth)` pages to the new Figma light theme (Inter/Bricolage Grotesque, `#fcfcfc` background) — currently stale relative to this spec.

---
*Phase: 02-core-product-loop (quick task 260706-jaq)*
*Completed: 2026-07-06*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-core-product-loop/02-UI-SPEC.md`
- FOUND: `.planning/quick/260706-jaq-update-02-ui-spec-md-dengan-detail-visua/260706-jaq-SUMMARY.md`
- FOUND: commit `b8ff368` (Task 1)
- FOUND: commit `f6f83d5` (Task 2)
- FOUND: commit `0a30379` (Task 3)
