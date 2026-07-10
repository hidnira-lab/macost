# Phase 4: Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 4-Polish
**Areas discussed:** Offline queue behavior, Pixel art visualization, Solo execution strategy

---

## Offline queue behavior (OFF-01)

| Question | Option | Description | Selected |
|---|--------|-------------|----------|
| Scope of offline actions | Transaksi baru saja | Only create transactions queue offline | |
| | Transaksi + edit/delete | Full transaction CRUD offline | |
| | Semua aksi (termasuk goal/allocation) | Broadest scope, incl. goal + allocation | ✓ |
| Allocation suggestion timing for offline side-income | Suggestion muncul setelah sync berhasil | Modal appears once transaction syncs | ✓ |
| | Skip suggestion untuk transaksi offline | Never trigger suggestion for offline-entered txns | |
| Duplicate/conflict prevention on sync | Client-generated UUID idempotency key | Backend checks UUID to dedupe retries | ✓ |
| | Tidak perlu — sync sekali jalan | No dedupe logic, accept small dup risk | |
| Sync trigger | Otomatis begitu online terdeteksi | Auto-fire on `online` event | ✓ |
| | Otomatis + tombol manual | Auto + manual retry button | |

**User's choice:** Broadened scope (goal + allocation, not just transactions) — deliberate after being shown the OFF-01 text says "transaksi" and the timeline risk was flagged directly. Suggestion deferred to post-sync. UUID idempotency. Fully automatic sync on reconnect.

**Notes:** Claude flagged that "semua aksi" exceeds the literal REQUIREMENTS.md OFF-01 text before the user confirmed — this is recorded in CONTEXT.md as D-01 with an explicit fallback/descope path (D-10) in case time runs short.

---

## Pixel art visualization (VIS-01)

| Question | Option | Description | Selected |
|---|--------|-------------|----------|
| Asset source | Set sprite pixel art siap pakai | Pre-made/found sprite set | |
| | CSS/procedural | Code-generated pixel look | |
| | (free text) Team draws assets manually | User wants a guide: count, per-state description, naming, size | ✓ (custom) |
| Number of states | 5 state tetap (0/25/50/75/100%) | Matches minimum success criteria | ✓ |
| | Lebih granular (per 10%) | 10 states | |
| Style | Generic single theme | One visual progression for all goals | ✓ |
| | Per-goal category theme | Different art per goal category | |
| Placement | Goal detail page saja | Detail page only | |
| | Goal detail + goal list/card | Both detail and card thumbnail | ✓ |
| Motif (follow-up) | Tanaman tumbuh (biji → pohon berbuah) | Plant-growing metaphor | ✓ |
| | Celengan/toples terisi koin | Piggy bank filling metaphor | |
| | Bangunan/rumah ke-assemble | Building-assembly metaphor | |

**User's choice:** Team draws the 5 sprites manually; asked Claude for a concrete asset production guide (count, description, naming convention, dimensions) rather than picking a pre-made/procedural source. 5 fixed states, generic single theme (not per-category), shown in both detail page and list/card. Motif: growing plant (seed → sprout → young plant → flowering → full fruiting plant/tree).

**Notes:** Claude produced the full asset guide (64×64px PNG, `apps/web/public/pixel-art/goal-plant-{0,25,50,75,100}.png`, per-state description in Bahasa Indonesia) directly in CONTEXT.md `<specifics>` since the user explicitly asked for it as part of this discussion, not left to planning.

---

## Solo execution strategy

| Question | Option | Description | Selected |
|---|--------|-------------|----------|
| Work order | Offline sync dulu, pixel art terakhir | Risky/technical piece first | ✓ |
| | Pixel art dulu, offline sync terakhir | Visible/demo-friendly piece first | |
| Fallback if time runs short | Offline scope goal+allocation diciutkan ke transaksi-saja | Descope offline back to OFF-01 literal scope first | ✓ |
| | Pixel art diciutkan ke 3 state | Reduce pixel art states first | |
| Testing scope | Backend sync-endpoint tests wajib, frontend manual UAT | Pytest for idempotency logic; manual UAT for UI | ✓ |
| | Manual UAT semua, skip automated test | No new automated tests at all | |

**User's choice:** Tackle offline sync (higher-risk, more technical) first while there's schedule slack; pixel art last since it's mechanical once assets exist. If time runs short, the first thing to cut is the broadened offline scope (goal/allocation), reverting to transactions-only — pixel art's 5 states are the floor, not the first cut. Backend gets mandatory pytest coverage for the idempotency/dedup logic; frontend UI (offline indicator, pixel art rendering) is verified manually since no frontend test framework exists yet.

---

## Claude's Discretion

- Sync status indicator (OFF-02) exact placement and visual treatment.
- IndexedDB schema design (object stores, indexes).
- Conflict-resolution mechanics beyond the idempotency-UUID rule for edge cases (e.g., goal deleted server-side while an edit was queued offline).
- Precise CSS/component structure for rendering pixel art at two display sizes.
- Bahasa Indonesia copy for sync status states and offline banners.

## Deferred Ideas

- Manual "sync now" button — rejected in favor of fully automatic sync; could be revisited post-MVP if auto-sync proves unreliable.
- Per-goal-category pixel art themes — rejected in favor of one generic theme; could revisit post-MVP for more visual variety.
- Areas not discussed at all (user chose to skip): "Sync status indicator" as a dedicated area — left to Claude's Discretion instead of a vision-level discussion.
