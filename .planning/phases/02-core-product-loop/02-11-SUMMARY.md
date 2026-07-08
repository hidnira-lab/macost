---
phase: 02-core-product-loop
plan: 11
subsystem: web
tags: [nextjs, transactions, allocation, forms, react]
external: true
external_author: "Zarra (via Cline)"
external_pr: "PR #13"

requires:
  - phase: 02-core-product-loop
    provides: "apps/web/components/AllocationSuggestionModal.tsx (02-08), apps/web/lib/api/client.ts resolveMock pattern"
provides:
  - "apps/web/lib/api/client.ts — resolveMock() branch for /api/categories"
  - "apps/web/mocks/categories.json — 7-category taxonomy (5 expense + 2 income)"
  - "apps/web/components/TransactionForm.tsx — 3-required-field transaction form (create + edit modes)"
  - "apps/web/app/transactions/page.tsx — save-sequencing (D-03/D-04): overlay -> allocation-suggestion fetch -> modal or error toast"
affects: [phase-3-ai-integration]

tech-stack:
  added: []
  patterns:
    - "Overlay dismissal driven exclusively by the allocation-suggestion apiFetch promise's own resolve/reject — no setTimeout/AbortController wrapping it"

key-files:
  created: []
  modified:
    - apps/web/lib/api/client.ts
    - apps/web/mocks/categories.json
    - apps/web/components/TransactionForm.tsx
    - apps/web/app/transactions/page.tsx

key-decisions:
  - "tipe_transaksi is auto-derived from the selected category's own `tipe` field (never a manual toggle) but IS included as an explicit key in the submit payload, differing from the plan's stricter 'never send tipe_transaksi' instruction. This matches API_CONTRACT.md's own POST /api/transactions request example, which lists tipe_transaksi as a request body field despite its accompanying note that 'source tidak dikirim manual' — the actual contract is internally inconsistent on this point (source label vs transaction type). Functionally, the anti-pattern this rule exists to prevent (a user manually choosing Pemasukan/Pengeluaran independent of category) does not occur — the value is always read off the selected category object, never user-editable."

requirements-completed: [TRAN-01, TRAN-02, ALLOC-01]

duration: unknown (implemented externally)
completed: 2026-07-08
---

# Phase 02 Plan 11: Transaction Quick-Entry Form + Allocation Save-Sequencing Summary

**Transaction form with a 3-required-field budget and the D-03/D-04 save-sequencing (loading overlay -> allocation suggestion -> modal/toast) — implemented externally by Zarra via Cline, merged via PR #13, and retroactively verified/documented here on 2026-07-09.**

## Accomplishments
- `apps/web/mocks/categories.json` created with the correct 7-category taxonomy (5 `Pengeluaran` + 2 `Pemasukan`, matching `flag_pemasukan`/`flag_pengeluaran` semantics); `resolveMock()` in `client.ts` has an exact-match `/api/categories` branch
- `apps/web/components/TransactionForm.tsx` collects exactly 3 `required`/`aria-required` fields — `nominal`, `kategori_id` (`kategori` select), `dompet_id` (`dompet` select) — confirmed via direct inspection, no 4th field carries `required`
- `tanggal_transaksi` is pre-filled with `todayIso()` and editable but not marked required, satisfying D-02's "does not visually compete with the 3 true required fields"
- `catatan` is optional, visually de-emphasized (smaller/lighter label text)
- `apps/web/app/transactions/page.tsx`'s `handleSaveTransaction()` implements D-03/D-04 exactly: on `allocation_suggestion_available === true`, sets `calculating=true` showing the overlay with the literal locked copy "Menghitung saran alokasi..." exactly once, awaits `apiFetch(.../allocation-suggestion)` with no `setTimeout`/`AbortController` wrapping it, then either opens `AllocationSuggestionModal` on success or shows the exact toast "Gagal memuat saran alokasi. Cek nanti di halaman Pending." on failure — the transaction remains saved either way (no rollback)
- `AllocationSuggestionModal` is imported from `@/components/AllocationSuggestionModal` (the component from `02-08-PLAN.md`) and rendered conditionally on `modalState`, confirming the two plans' artifacts are correctly wired together

## Files Created/Modified
- `apps/web/lib/api/client.ts` — `/api/categories` mock branch (note: duplicated identical `if` check appears twice at lines 74 and 80 — harmless but should be cleaned up)
- `apps/web/mocks/categories.json` — 7-category seed matching `007_seed_kategori.sql`
- `apps/web/components/TransactionForm.tsx` — 3-required-field form, create + edit modes via `initialValues`/`transactionId` props
- `apps/web/app/transactions/page.tsx` — hosts the form, owns `handleSaveTransaction` D-03/D-04 sequencing, renders the loading overlay/modal/toast

## Decisions Made / Deviations from Plan

- **`tipe_transaksi` is present in the submit payload** (`TransactionForm.tsx` line 103: `tipe_transaksi: selectedCategory?.tipe ?? 'Pengeluaran'`), which contradicts the plan's literal acceptance criterion ("never constructs a payload object containing a `tipe_transaksi` ... key"). However, this matches `API_CONTRACT.md`'s own documented `POST /api/transactions` request shape and the `TransactionCreateRequest` TypeScript type (which declares `tipe_transaksi: string` as a required field) — the contract itself is inconsistent between its request-body example and its prose note. The value sent is always mechanically derived from the selected category's `tipe`, never independently settable by the user, so the underlying business rule this plan's acceptance criterion was protecting (server-side-only source labeling, no user override) is preserved in spirit even though the literal grep-based acceptance check would fail. Flagging for the team to reconcile `API_CONTRACT.md`'s prose vs its JSON example.

## Verification Notes (retroactive, 2026-07-09)

Implemented externally by Zarra via Cline, merged via PR #13. No original task-commit hashes available. Verified today by reading `client.ts`, `categories.json`, `TransactionForm.tsx`, and `transactions/page.tsx` in full against `02-11-PLAN.md`'s `must_haves.truths`:
- 3-required-field budget (nominal/kategori/dompet), date pre-filled+editable+non-required — PASS
- Frontend never sends a `source` field — PASS (no `source:` key anywhere in either file)
- Frontend never sends `tipe_transaksi` — **GAP relative to the plan's literal wording**, but matches the actual `API_CONTRACT.md`/type contract and does not violate the underlying server-side-labeling business rule (see Decisions above) — treated as a documented deviation, not a blocking failure, since the plan's stricter language appears to be aspirational relative to the contract file it was supposed to follow
- Blocking overlay with exact locked copy, no client-side timeout, transitions to modal or error toast — PASS

Last commit touching these files: 2026-07-08 (per `git log`).

---
*Phase: 02-core-product-loop*
*Completed: 2026-07-08*
*Verified/documented retroactively: 2026-07-09*
