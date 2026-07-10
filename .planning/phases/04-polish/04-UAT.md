---
status: testing
phase: 04-polish
source: [04-VERIFICATION.md]
started: 2026-07-10T16:06:25Z
updated: 2026-07-10T16:06:25Z
---

## Current Test

number: 1
name: Live Supabase migration confirmation
expected: |
  Supabase Dashboard -> Table Editor shows idempotency_key (nullable UUID) on
  transaksi, goal, and alokasi; Database -> Indexes shows
  transaksi_idempotency_unique / goal_idempotency_unique /
  alokasi_idempotency_unique.
awaiting: user response

## Tests

### 1. Live Supabase migration confirmation
expected: Supabase Dashboard -> Table Editor shows idempotency_key (nullable UUID) on all 3 tables; Database -> Indexes shows the 3 partial unique indexes (transaksi_idempotency_unique, goal_idempotency_unique, alokasi_idempotency_unique).
result: [pending]

### 2. Offline transaction entry -> auto-sync -> deferred allocation modal (D-02)
expected: Disable network, enter a side-income transaction, confirm it's accepted with no error and NO allocation-suggestion modal. Re-enable network and wait (no manual action) for it to sync. Transaction appears server-side automatically; the allocation-suggestion modal appears only after sync (via in-page CustomEvent listener or the /allocations/pending list) — never at offline-entry time, never auto-executed.
result: [pending]

### 3. Offline goal-create then allocation-confirm/skip ordering
expected: While offline, create a new goal, then confirm or skip an allocation referencing that same goal. Go back online. Both sync in the correct order (goal lands server-side before the allocation references it) with no 404 on the allocation step.
result: [pending]

### 4. Sync status indicator full-cycle observation (browser + Tauri desktop)
expected: Watch the indicator through a full offline -> queued write -> online -> syncing -> synced cycle, in both the browser and the Tauri desktop build. Bar is absent by default; shows "Offline" while disconnected; "Menyinkronkan..." during sync; "Tersinkron" for ~2s then auto-hides; never gets stuck in a wrong state.
result: [pending]

### 5. Pixel art visual crispness and boundary correctness
expected: Open a goal at progress boundaries 0/24/25/49/50/74/75/99/100/>100% (seed/adjust test data as needed); observe the sprite at both the goal detail page (128px) and goal list/card (48px), in both browser and Tauri desktop. Correct goal-plant-{state}.png renders at each boundary per pixelArtState()'s logic; image-rendering: pixelated produces crisp (non-blurry) edges at both sizes.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
