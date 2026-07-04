---
phase: quick-260704-quj
plan: 01
subsystem: docs
tags: [documentation, team-onboarding, github-cli, ship]

requires: []
provides:
  - "docs/PANDUAN_TEKNIKAL_TIM.md documents the gh CLI one-time setup requirement and the full /gsd-ship PR-create-then-manual-merge flow"
affects: [team-onboarding-docs]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - docs/PANDUAN_TEKNIKAL_TIM.md

key-decisions:
  - "Confirmed via reading .claude/gsd-core/workflows/ship.md that /gsd-ship hard-requires `which gh && gh auth status` to pass, and only creates the PR — never auto-merges — before documenting this so the doc reflects actual tool behavior, not assumption"
  - "Added as new Section 4a rather than folding into existing Section 4, so it reads as a standalone one-time-setup reference teammates can jump to directly"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "docs/PANDUAN_TEKNIKAL_TIM.md contains gh CLI install instructions (winget/brew/apt), gh auth login steps, and both merge methods (GitHub web UI and gh pr merge)"
    verification:
      - kind: unit
        ref: "grep -c 'gh auth login' and 'gh pr merge' in the file -- both 1 (present)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-04
status: complete
---

# Quick Task 260704-quj: Add gh CLI setup and PR/merge flow to team guide Summary

**Added a new Section 4a to docs/PANDUAN_TEKNIKAL_TIM.md explaining the one-time GitHub CLI setup required before /gsd-ship works, and clarifying that /gsd-ship creates the PR automatically but never auto-merges.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Confirmed via `.claude/gsd-core/workflows/ship.md` that `/gsd-ship` blocks with setup instructions if `gh` isn't installed/authenticated (`which gh && gh auth status` check), and that it only runs `gh pr create` — never merges
- Added Section 4a: cross-platform `gh` install commands (winget/brew/apt), `gh auth login` steps, and both merge methods (GitHub web UI button, or `gh pr merge <number> --merge`)
- Cross-referenced from the existing Section 4 step 5 so readers following the execution steps land on this section at the right moment

## Task Commits

1. **Task 1: Add gh CLI setup + PR/merge flow section** - `9c91bd5` (docs)

## Files Created/Modified
- `docs/PANDUAN_TEKNIKAL_TIM.md` - New Section 4a added; Section 4 step 5 updated with a cross-reference

## Decisions Made
- Verified the actual tool behavior in `ship.md` before writing documentation, rather than assuming — this matched a real gap discovered this session (had to install + authenticate `gh` CLI manually mid-session to create PRs)

## Deviations from Plan
None.

## Issues Encountered
None.

## User Setup Required
None — docs-only change, ready to share.

## Next Phase Readiness
- Team guide now covers the full local-dev-to-shipped-PR lifecycle including a tooling prerequisite that would otherwise block teammates silently on their first `/gsd-ship` attempt

---
*Phase: quick-260704-quj*
*Completed: 2026-07-04*

## Self-Check: PASSED
- FOUND: docs/PANDUAN_TEKNIKAL_TIM.md
- FOUND: 9c91bd5 (task commit)
