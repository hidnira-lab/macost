---
quick_id: 260704-quj
description: Tambah penjelasan setup gh CLI dan alur PR/merge ke docs/PANDUAN_TEKNIKAL_TIM.md
date: 2026-07-04
---

## Task 1: Add gh CLI setup + PR/merge flow explanation to docs/PANDUAN_TEKNIKAL_TIM.md

<files>
- docs/PANDUAN_TEKNIKAL_TIM.md
</files>

<action>
Confirmed by reading .claude/gsd-core/workflows/ship.md: /gsd-ship requires `gh` CLI installed AND authenticated (`which gh && gh auth status`) — if missing/unauthenticated it blocks with setup instructions and exits. It also only creates the PR (via `gh pr create`) — it does NOT auto-merge; merging to main is a separate manual step.

Add a new short subsection near Section 4 (Langkah Eksekusi) or as part of Section 6 (Aturan Kerja Bersama) covering:
1. One-time setup per person: install GitHub CLI (winget on Windows / brew on Mac / apt or snap on Linux), then `gh auth login` (interactive — choose GitHub.com, HTTPS, login via browser).
2. What /gsd-ship actually does: creates the PR automatically via gh CLI, but does NOT merge it — that's a separate manual step.
3. How to merge afterward: either via GitHub web UI (Merge pull request button), or `gh pr merge <number> --merge` from command line — and per team convention (Section 6), get at least a self-review pass before merging, and announce in the team channel with the PR link.

Keep it concise, consistent with the existing doc's direct/copy-paste style.
</action>

<verify>
grep "gh auth login" and "gh pr merge" both present in the updated file.
</verify>

<done>
docs/PANDUAN_TEKNIKAL_TIM.md explains the gh CLI setup requirement and the full PR-create-then-manual-merge flow for /gsd-ship.
</done>
