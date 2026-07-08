---
phase: 02-core-product-loop
plan: 07
subsystem: web
tags: [nextjs, goals, forms, react]
external: true
external_author: "Khayyira (via Cline)"
external_pr: "PR #12"

requires:
  - phase: 02-core-product-loop
    provides: "apps/web/mocks/goal-detail.json, apps/web/mocks/goals.json, apps/web/lib/api/types.ts (GoalDetailResponse, GoalCreateRequest)"
provides:
  - "apps/web/app/goals/[id]/page.tsx — goal detail page with full field set, allocation history, guarded delete"
  - "apps/web/app/goals/new/page.tsx — shared create/edit goal form (?edit={id})"
affects: [phase-3-ai-integration]

tech-stack:
  added: ["lucide-react (icon set used in both pages)"]
  patterns:
    - "Shared create/edit route driven by ?edit={id} search param via useSearchParams, wrapped in Suspense"
    - "Structured error-code branching on delete (GOAL_HAS_ALLOCATIONS) rather than generic failure handling"

key-files:
  created: []
  modified:
    - apps/web/app/goals/[id]/page.tsx
    - apps/web/app/goals/new/page.tsx

key-decisions:
  - "Goal create/edit form uses a 1-5 range slider (not radio buttons) for skor_keinginan, satisfying the plan's 'bounded discrete score, not free-text' requirement via a different but equally valid input widget"
  - "Delete confirmation reuses window.confirm() with the exact plan-specified copy, matching the wallets/page.tsx pattern"

requirements-completed: [GOAL-01, GOAL-03, GOAL-04, GOAL-05]

duration: unknown (implemented externally)
completed: 2026-07-07
---

# Phase 02 Plan 07: Goal Detail + Create/Edit Form Summary

**Goal Detail page (full fields + allocation history + guarded delete) and shared Create/Edit form — implemented externally by Khayyira via Cline, merged via PR #12, and retroactively verified/documented here on 2026-07-09.**

## Accomplishments
- `apps/web/app/goals/[id]/page.tsx` renders `nama_goal`, `nominal_terkumpul`/`nominal_target` (Rp-formatted), `progress_pct` bar, `deadline`, and a full `allocation_history` list (each entry Rp-formatted `nominal_alokasi` + formatted `tanggal_alokasi`)
- Edit action navigates to `/goals/new?edit={id}`; Delete action calls `window.confirm('Hapus goal ini? Tindakan ini tidak dapat dibatalkan.')` then `apiMutate(DELETE)`
- Delete error handling branches specifically on `error.code === 'GOAL_HAS_ALLOCATIONS'` (verified via `isApiErrorBody` type guard), showing the exact inline copy "Goal ini punya riwayat alokasi, tidak bisa dihapus." — never falls through to a generic failure message for this code
- `apps/web/app/goals/new/page.tsx` handles both create (`POST /api/goals`) and edit (`PUT /api/goals/{id}`) via a single `?edit={id}`-driven component, pre-filling all 4 fields (`nama_goal`, `nominal_target`, `deadline`, `skor_keinginan`) when in edit mode
- CTA copy is exactly "Buat Goal" (create) / "Simpan Perubahan" (edit) per UI-SPEC's Copywriting Contract
- Client-side deadline validation (`isTodayOrPast()`) rejects today-or-earlier dates with error "Tenggat waktu harus setelah hari ini." before submit, with the backend treated as the validation authority per the plan's threat model

## Files Created/Modified
- `apps/web/app/goals/[id]/page.tsx` — goal detail, allocation history, guarded delete
- `apps/web/app/goals/new/page.tsx` — shared create/edit form, quick-start templates, 1-5 importance slider

## Verification Notes (retroactive, 2026-07-09)

Implemented externally by Khayyira via Cline, merged via PR #12. No original task-commit hashes available. Verified today by reading both files in full against `02-07-PLAN.md`'s `must_haves.truths` and acceptance criteria:
- Goal detail page shows full field set + allocation history — PASS
- Create form has exactly the 4 required fields, deadline validated as future-only — PASS
- Edit mode pre-fills the same form — PASS
- `GOAL_HAS_ALLOCATIONS` delete error shows the exact inline copy instead of generic failure — PASS (literal string `GOAL_HAS_ALLOCATIONS` confirmed present in `goals/[id]/page.tsx`)

No gaps found. Last commit touching these files: 2026-07-07 (per `git log`).

## Deviations from Plan

- `skor_keinginan` input is a `<input type="range">` slider (1-5, with labeled steps "Boleh ada" → "Krusial!") rather than 5 discrete radio buttons as the plan suggested as one example — this is explicitly allowed by the plan's own wording ("e.g. 5 radio buttons or a labeled range input"), so this is not a deviation, just the alternative the plan itself permitted.

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-07*
*Verified/documented retroactively: 2026-07-09*
