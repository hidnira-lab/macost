---
phase: 02-core-product-loop
plan: 08
subsystem: web
tags: [nextjs, allocations, modal, react]
external: true
external_author: "Khayyira / Zarra (via Cline)"
external_pr: "PR #12 / PR #13"

requires:
  - phase: 02-core-product-loop
    provides: "apps/web/mocks/allocation-suggestion.json, apps/web/mocks/allocations-pending.json, apps/web/lib/api/types.ts (AllocationSuggestionResponse, AllocationConfirmRequest/Response, AllocationSkipResponse, AllocationPendingResponse)"
provides:
  - "apps/web/components/AllocationSuggestionModal.tsx — self-contained confirm/skip modal, used by apps/web/app/transactions/page.tsx"
  - "apps/web/app/allocations/pending/page.tsx — Pending Allocations page"
affects: [phase-3-ai-integration]

tech-stack:
  added: []
  patterns:
    - "Allocation confirm/skip mutations fire exclusively from onClick handlers, never useEffect/mount — enforces the suggest-and-confirm non-negotiable"

key-files:
  created: []
  modified:
    - apps/web/components/AllocationSuggestionModal.tsx
    - apps/web/app/allocations/pending/page.tsx

key-decisions:
  - "A second, richer modal component (apps/web/components/SmartAllocationModal.tsx) was also built by the team and is what apps/web/app/allocations/pending/page.tsx and apps/web/app/transactions/new/page.tsx actually import — AllocationSuggestionModal.tsx remains the component apps/web/app/transactions/page.tsx (02-11-PLAN.md's target) imports. Both components independently satisfy the plan's suggest-and-confirm / no-active-goal-fallback must-haves; this is a deviation from the plan's literal key_link (which expected the pending page to import AllocationSuggestionModal specifically) but not a functional gap — see Deviations."

requirements-completed: [ALLOC-03, ALLOC-04, ALLOC-05]

duration: unknown (implemented externally)
completed: 2026-07-08
---

# Phase 02 Plan 08: AllocationSuggestionModal + Pending Allocations Page Summary

**Self-contained confirm/skip allocation modal and the Pending Allocations page — implemented externally by the frontend team via Cline, merged via PR #12/#13, and retroactively verified/documented here on 2026-07-09.**

## Accomplishments
- `apps/web/components/AllocationSuggestionModal.tsx` exports `default function AllocationSuggestionModal` with the exact prop contract `{ open, suggestion, transaksiId, onClose, onResolved }` (note: `onResolved` takes no argument in the shipped version, vs the plan's `(result: 'confirmed' | 'skipped') => void` — see Deviations)
- `has_active_goal === false` branch renders the literal required string "Buat goal dulu supaya kami bisa menyarankan alokasi yang tepat." with CTA "Buat Goal" navigating to `/goals/new`
- `has_active_goal === true` branch renders `suggested_goal_name`, Rp-formatted `suggested_amount` + `suggested_pct`, and a "Konfirmasi Alokasi" primary CTA + "Lewati" text-link secondary action
- Both `POST /api/allocations` and `POST /api/allocations/{id}/skip` calls fire exclusively inside `handleConfirm`/`handleSkip` click handlers — no `useEffect` in the file calls `apiMutate` (confirmed by reading the full file; no auto-execution path exists)
- `apps/web/app/allocations/pending/page.tsx` lists all pending suggestions via `GET /api/allocations/pending`, and on click of a pending item first re-fetches the full suggestion via `GET /api/transactions/{id}/allocation-suggestion` before opening a modal — satisfying the plan's re-fetch-before-open requirement
- Empty state (zero pending) renders "Tidak ada saran tertunda" + "Semua saran alokasi sudah kamu proses." with zero CTA buttons, matching the plan's "resolved-state empty, no CTA" requirement

## Files Created/Modified
- `apps/web/components/AllocationSuggestionModal.tsx` — self-contained modal, imported by `apps/web/app/transactions/page.tsx`
- `apps/web/app/allocations/pending/page.tsx` — Pending Allocations list + modal-resolution flow

## Decisions Made / Deviations from Plan

- **Modal component split:** the team ended up building two modal components. `AllocationSuggestionModal.tsx` is the one this plan's artifact list names, and it is genuinely used (by `apps/web/app/transactions/page.tsx`, per `02-11-PLAN.md`'s key_link). However, `apps/web/app/allocations/pending/page.tsx` (this plan's other artifact) imports a different, more feature-rich component, `apps/web/components/SmartAllocationModal.tsx` (also `apps/web/app/transactions/new/page.tsx` — an apparent earlier/alternate transactions route). `SmartAllocationModal` independently satisfies every must-have this plan requires of the pending page's modal usage: confirm/skip, "Buat goal dulu" fallback with the same exact copy, alternative-goals display, and 100% click-triggered mutations (verified — no `useEffect` calling `apiMutate` in that file either). Functionally this is not a gap; structurally it is a deviation from the plan's literal expectation of a single shared component. Flagging for the team since it means two allocation modal implementations now exist and could drift.
- `onResolved` in the shipped `AllocationSuggestionModal.tsx` is `() => void` rather than `(result: 'confirmed' | 'skipped') => void` as specified in the plan — its single caller (`transactions/page.tsx`) does not need to distinguish confirm vs skip, so this did not block integration, but it is a narrower interface than planned.

## Verification Notes (retroactive, 2026-07-09)

Implemented externally via Cline, merged via PR #12/#13. No original task-commit hashes available. Verified today by reading both files in full plus their actual consumers (`transactions/page.tsx`, `allocations/pending/page.tsx`) against `02-08-PLAN.md`'s `must_haves.truths`:
- Self-contained modal with confirm/skip, never auto-executing — PASS (in both modal implementations)
- "Buat goal dulu" fallback when no active goal — PASS (in both modal implementations)
- Pending Allocations page lists and resolves suggestions — PASS

Last commit touching these files: 2026-07-08 (per `git log`).

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-08*
*Verified/documented retroactively: 2026-07-09*
