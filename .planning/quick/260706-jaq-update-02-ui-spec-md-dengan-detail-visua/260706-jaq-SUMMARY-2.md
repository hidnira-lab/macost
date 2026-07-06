---
phase: 02-core-product-loop
plan: 2
subsystem: docs/ui-spec
tags: [figma, ui-spec, documentation, design-system]
dependency-graph:
  requires: [260706-jaq-round-1 (FIGMA-CONTEXT.md, SUMMARY.md, 02-UI-SPEC.md round-1 baseline)]
  provides: [02-UI-SPEC.md round-2 (resolved decisions, full frame detail, Palette A/B flag)]
  affects: [Phase 2 execution planning for Transaction History, Goal Detail, Create/Edit Goal, Smart Allocation Modal, Pending Suggestions pages]
tech-stack:
  added: []
  patterns: [Figma-sourced visual-layout documentation as design contract]
key-files:
  created: []
  modified:
    - .planning/phases/02-core-product-loop/02-UI-SPEC.md
decisions:
  - "Dashboard KPI order stays per RESEARCH.md (expense breakdown -> goal progress -> trend -> overspending alert -> balance), overriding Figma 156:198's literal top-of-page Overspending Alert placement — only the alert's own card styling is taken from Figma."
  - "SAW default weights reconfirmed canonical (22.5/21.9/21.5/17.8/16.2 survey n=62) — Figma 156:824's 25/20/20/15/20 remains illustrative-only, never adopted."
  - "Pending Suggestions page is the Smart Allocation confirmation queue (not the AI Assistant nudge feed) — reuses 156:1646's card/list visual layout with replaced content semantics (goal name, suggested amount+%, Review/Confirm opening the 156:653 modal)."
  - "Transaction History 'History' tab is its own bottom-nav destination, not a pushed sub-page from Home."
  - "Palette A (6/8 frames) is canonical; Palette B (Transaction History, Pending Suggestions) is flagged for normalization to Palette A tokens during implementation, pending team confirmation."
metrics:
  duration: "~15 minutes"
  completed: 2026-07-06
status: complete
---

# Phase 2 Plan 2: Update 02-UI-SPEC.md with Round-2 Figma detail (resolutions + full visual layout) Summary

Round-2 update to `02-UI-SPEC.md`: converted 4 of round-1's 5 flagged Figma-vs-spec open questions into explicitly RESOLVED decisions per the user's round-2 instructions, added full per-page visual-layout detail for 5 frames round 1 only screenshotted (Transaction History, Goal Detail, Create/Edit Goal Form, Smart Allocation Modal, plus a new Pending Suggestions subsection), and flagged a newly-discovered Palette A/B color-token discrepancy in the Design System.

## What Was Built

**Task 1 — Resolved Decisions section (commit `6f16855`):**
- Added a new "## Resolved Decisions (2026-07-06, Round 2 — User-Directed)" section immediately before the Open Questions heading, with 4 items each labeled `RESOLVED (2026-07-06, Round 2)`: Dashboard KPI order, SAW default weights, Pending Suggestions scope, Transaction History nav tab.
- Renamed "## Open Questions / Flagged Discrepancies (Post-Figma-Extraction, 2026-07-06)" to "## Open Questions / Flagged Discrepancies (Still Open)", retaining only the "Create First Goal" vs D-06 item (renumbered as the sole item "1."), unchanged in substance.
- Fixed two stale cross-references: the Dashboard visual-layout paragraph and the "Create First Goal" paragraph now point at the correct current section names instead of the old numbered-item references.
- Updated the Checker Sign-Off addendum to state 4 of 5 discrepancies are resolved (Round 2, user-directed) and only 1 remains pending team resolution.

**Task 2 — Full per-page visual-layout detail (commit `b11b8ae`):**
- Frame Node-ID Map: added a new row for `156:1646` (Pending Suggestions / Smart Allocation confirmation queue) directly after the Smart Allocation Suggestion row; replaced the "explicitly out of scope" paragraph with an in-scope resolution statement.
- Transaction History (`156:1526`): replaced thin paragraph with full structural detail — Palette B flag, search bar, filter button, date-group headers, grouped-container row layout (vs individually-boxed cards elsewhere), row anatomy, and the nav-tab resolution note.
- Goal Detail (`156:558`): full structural detail — Palette A confirmation, hero graphic (mix-blend-overlay pixel art), Progress Card anatomy, Allocation History card pattern (individually-boxed, orange/blue icon tinting), footer icon-with-caption actions.
- Create Goal Form (`156:713`): full structural detail — header, Quick Start template chips with per-template tint colors, form section field-by-field anatomy, Importance slider, CTA styling, and the bottom-nav-suppressed note confirming it's a pushed full-screen flow.
- Smart Allocation Modal (`156:653`): superseded round-1's screenshot-only description with full structural detail — dimmed/blurred background, frosted-glass modal card, header illustration band, mixed-weight body copy, mini progress-bar context card (Current Progress vs Suggested Addition segments), and the 3 stacked actions.
- New "## Visual Layout — Pending Suggestions (`156:1646`)" subsection: documents the resolved-scope confirmation queue, flags Palette B, explains what's reused (card/list pattern) vs not reused (greeting header), and the replaced content semantics per card.

**Task 3 — Palette A/B discrepancy flag (commit `39cb658`):**
- Added a new "**⚠ Palette A/B Discrepancy (flagged 2026-07-06, Round 2) — do not silently normalize:**" subsection in the Color section, documenting both palettes' exact hex values (Palette A: 6/8 frames including Dashboard and Goal List; Palette B: Transaction History and Pending Suggestions), and an explicit recommendation to treat Palette A as canonical with normalization required for Palette B frames pending team confirmation.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed per their `<action>` specifications; verification commands for each task passed on first attempt.

## Verification

All plan-level verification checks confirmed:
1. "Resolved Decisions (2026-07-06, Round 2 — User-Directed)" section exists with all 4 items stated as RESOLVED, each citing the user-directed round-2 resolution.
2. "Open Questions" section renamed to "(Still Open)" with only 1 remaining item (Create First Goal vs D-06), unchanged in substance.
3. Transaction History, Goal Detail, Create/Edit Goal Form, and Smart Allocation Modal all have full structural visual-layout detail; new Pending Suggestions (156:1646) subsection exists documenting the resolved scope.
4. Design System > Color section contains an explicit, clearly-flagged Palette A/B discrepancy note with both palettes' hex values and a canonical recommendation.
5. `git diff` across all 3 commits confirms the "Interaction & State Contracts" section, "Copywriting Contract" table, round-1 "Theme Resolution" callout, and Frame Node-ID Map identity are unchanged in substance — the only textual overlap found was an incidental cross-reference mention inside the now-removed open-question text (not a change to the referenced section itself).

## Self-Check: PASSED

- FOUND: `.planning/phases/02-core-product-loop/02-UI-SPEC.md`
- FOUND: commit `6f16855` (Task 1)
- FOUND: commit `b11b8ae` (Task 2)
- FOUND: commit `39cb658` (Task 3)

No files outside `.planning/phases/02-core-product-loop/02-UI-SPEC.md` were modified.
