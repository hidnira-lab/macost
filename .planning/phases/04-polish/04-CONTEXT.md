# Phase 4: Polish - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Phase 4's two polish capabilities so the app is demo-ready for Expo (2026-07-14):

1. **Pixel art goal visualization (VIS-01)** — each goal detail page (and goal list/card) shows a pixel-art plant that visibly grows through 5 fixed states as `progress_pct` increases (0/25/50/75/100%).
2. **Offline transaction cache + auto-sync (OFF-01)** — data entered while offline is queued locally (IndexedDB via `idb`) and automatically synced to the backend when connectivity returns, with a clear offline/syncing/synced status indicator (OFF-02).

**Execution model differs from Phase 1-3:** this phase is executed **solo by Hidayat** (not split across the 4-person team) — no cross-team ownership table needed for planning.

HOW to implement is what this phase clarifies; WHAT to build (VIS-01, OFF-01, OFF-02) is fixed by ROADMAP.md and REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Offline queue — scope (OFF-01)
- **D-01:** Offline scope is **broadened beyond the literal OFF-01 requirement text** (which says "transaksi") to include **goal create/edit and allocation confirm/skip**, all queued in IndexedDB and synced automatically on reconnect. This was a deliberate call after the tradeoff was flagged (higher conflict-handling complexity, tight 4-day timeline) — see D-06 Fallback for the descope path if time runs out.
- **D-02:** A side-income transaction entered offline does **not** show the allocation suggestion modal immediately (SAW needs live server-side goal data). The suggestion modal appears **after that transaction successfully syncs** — user still gets full suggest-and-confirm, just deferred until sync completes.
- **D-03:** Every offline-queued write (transaction, goal action, allocation action) gets a **client-generated UUID as an idempotency key**. On sync, the backend checks this UUID to prevent duplicate inserts if a sync is retried (e.g., partial network failure, app restart mid-sync).
- **D-04:** Sync runs **automatically the moment the browser/Tauri WebView detects it's back online** (`online` event listener) — no manual "sync now" button required for MVP.

### Pixel art visualization (VIS-01)
- **D-05:** Motif is a **growing plant**: biji (seed) → tunas (sprout) → tanaman muda (young plant) → tanaman berbunga (flowering) → pohon/tanaman berbuah penuh (full, fruiting). One **generic theme reused for every goal** regardless of goal category — not per-category art.
- **D-06:** Exactly **5 fixed states** at 0% / 25% / 50% / 75% / 100% (matches VIS-01's minimum). No finer-grained interpolation.
- **D-07:** Displayed in **both** the goal detail page (`apps/web/app/goals/[id]/page.tsx`) and the goal list/card view — same asset, rendered at two sizes via CSS (see Asset Guide below), not two separate asset sets.
- **D-08 — Asset production is manual (team-made), not sourced/generated.** Claude must produce a concrete **asset guide** (count, per-state description, file naming, dimensions) so the team can draw them. See `<specifics>` → Pixel Art Asset Guide below — this is a required deliverable of this discussion, not left to planning.

### Execution strategy (solo, tight timeline)
- **D-09:** Work order is **offline sync first, pixel art last**. Rationale: offline queue + idempotency + conflict handling is the riskier/more technical piece — tackle it while there's still slack in the schedule. Pixel art is comparatively mechanical once assets exist and is safe to finish close to the wire.
- **D-10 — Fallback/descope order if time runs short before 2026-07-14:** First cut is **narrowing offline scope back down to transactions-only** (drop the D-01 broadening — goal/allocation offline actions get descoped, matching the original OFF-01 text), not shrinking pixel art states. Pixel art (5 states) and basic transaction offline-sync are the floor that must ship.
- **D-11:** Testing effort: **backend sync-endpoint tests are mandatory** (pytest, covering the idempotency/duplicate-prevention logic — this is where silent bugs are most costly since it touches real financial data). Frontend (offline indicator UI, pixel art rendering) is verified via **manual UAT in browser + Tauri desktop**, no new frontend test framework introduced given the timeline.

### Claude's Discretion
- Sync status indicator (OFF-02) exact placement and visual treatment (e.g., small badge in header/nav vs. toast vs. banner) — implementation detail, not a vision call.
- IndexedDB schema design (object stores, indexes) for the offline queue — follows `idb` package conventions.
- Exact conflict-resolution mechanics beyond the idempotency-UUID rule (D-03) for goal/allocation offline actions (e.g., what happens if a goal was deleted server-side while an edit was queued offline) — technical edge case, resolve during planning/execution using reasonable last-write-wins or reject-and-notify semantics.
- Precise CSS/component structure for rendering the pixel art at two sizes (detail vs. card).
- Bahasa Indonesia copy for sync status states and offline banners.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — VIS-01 (line 104), OFF-01 (line 108), OFF-02 (line 109). Note: OFF-01's literal text says "transaksi" only — D-01 above documents the deliberate scope broadening to goal+allocation; no REQUIREMENTS.md text change needed since D-10's fallback path restores the literal scope if time runs out.
- `.planning/ROADMAP.md` §Phase 4: Polish — goal, 3 success criteria, key risks (service workers unreliable in Tauri Android WebView → use `idb`, not service worker; Render/Railway cold start risk before Expo).

### Business rules (locked, from CLAUDE.md)
- `CLAUDE.md` rule #4 / `.claude/CLAUDE.md` — Smart Allocation always suggest-and-confirm, never auto-execute. This extends to D-02: the offline-synced side-income transaction still triggers the suggestion modal post-sync, never auto-allocates.
- `.claude/CLAUDE.md` Constraints — Hidayat is sole platform owner (Vercel/Railway/Supabase); no new env vars are anticipated for Phase 4 (IndexedDB is client-only), but flag if one emerges during planning.

### Design source of truth
- Figma (per CLAUDE.md "Sumber Desain UI") — request the relevant frame link for the offline status indicator and any goal-detail layout changes needed to fit the pixel art element, before building. The pixel art sprites themselves are net-new (not in existing Figma frames) — see Asset Guide below for what to draw.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/app/goals/[id]/page.tsx` — existing goal detail page; pixel art mounts here alongside existing progress data (`progress_pct`).
- `apps/web/app/goals/page.tsx` (goal list) — existing list/card view; pixel art thumbnail mounts per-card here.
- `apps/web/lib/api/client.ts` — established `USE_MOCK` + `apiFetch`/`apiMutate` split; offline queue's sync-on-reconnect calls reuse these for the actual network requests once online.
- `apps/web/components/BottomNav.tsx` — existing global nav-adjacent component; sync status indicator likely mounts near here or in a root layout, per Claude's Discretion.
- `backend/routers/transactions.py`, presumably `backend/routers/goals.py` / `backend/routers/allocations.py` (per Phase 2/3 pattern) — sync endpoints for queued offline writes attach here or via a new batched sync endpoint (planner's call).
- `backend/dependencies/auth.py` — JWKS JWT dependency; reuse for any new sync endpoint.

### Established Patterns
- Suggest-and-confirm / never auto-execute — extends to D-02 (offline side-income sync still shows the modal, just deferred).
- Backend service structure follows `routers/` + `services/` split (e.g., `saw_engine.py`, `goal_settings_service.py` from Phase 2/3).
- No IndexedDB/offline code exists yet anywhere in `apps/web/` — this is greenfield; no `idb` package installed yet (confirmed via `package.json` dependency scan).
- No pixel art assets or offline-related code found anywhere in `apps/web/` (confirmed via grep) — fully greenfield for both VIS-01 and OFF-01/02.

### Integration Points
- New offline queue writes to IndexedDB client-side, then POSTs to existing (or new batched) backend endpoints once online — must carry the D-03 idempotency UUID.
- Pixel art component reads `progress_pct` already present in the Goal entity (`apps/web/mocks/goals.json` shape / real `GET /api/goals` response) — no new API field needed.

</code_context>

<specifics>
## Specific Ideas

### Pixel Art Asset Guide (required deliverable — team draws these manually)

**Count:** 5 sprites total (one per fixed state).

**Format:** PNG with transparent background.

**Canvas size:** 64×64 px per sprite, drawn on a visible pixel grid (classic low-res pixel art scales cleanly at 2×/3×/4× without blurring). Do not draw at higher native resolution — keep it authentically low-res so `image-rendering: pixelated` (CSS) renders crisp edges at both display sizes (see Placement below).

**File naming & location:** `apps/web/public/pixel-art/goal-plant-{state}.png` where `{state}` is one of `0`, `25`, `50`, `75`, `100`:
- `apps/web/public/pixel-art/goal-plant-0.png`
- `apps/web/public/pixel-art/goal-plant-25.png`
- `apps/web/public/pixel-art/goal-plant-50.png`
- `apps/web/public/pixel-art/goal-plant-75.png`
- `apps/web/public/pixel-art/goal-plant-100.png`

**Per-state description (motif: growing plant):**
1. **0% — `goal-plant-0.png`:** Pot/tanah kosong dengan satu biji tertanam di permukaan tanah. Belum ada bagian hijau sama sekali — kesan "baru mulai".
2. **25% — `goal-plant-25.png`:** Tunas kecil muncul dari tanah dengan 1-2 daun kecil. Batang masih sangat pendek.
3. **50% — `goal-plant-50.png`:** Tanaman muda dengan batang lebih tinggi dan beberapa daun lebih besar. Belum ada bunga/buah — kesan "sedang tumbuh aktif".
4. **75% — `goal-plant-75.png`:** Tanaman mulai berbunga atau muncul kuncup buah. Batang & dedaunan lebih rimbun dari state 50%.
5. **100% — `goal-plant-100.png`:** Tanaman/pohon penuh, rimbun, dengan buah matang terlihat jelas (atau bunga mekar penuh). Kesan "selesai/berhasil" — boleh ditambah detail perayaan kecil (mis. kilau/sparkle 1-2 piksel) kalau style memungkinkan.

**Color palette:** Keep consistent across all 5 states (same palette family, just more saturated/vivid green as it grows) so the progression reads as one continuous plant, not 5 unrelated images. No specific hex codes mandated — match the app's existing pastel/soft branding tone if a reference is needed (check current Figma frames for the app's color language before finalizing).

**Rendering (for planner/executor, not the artist):** Same 5 PNGs are reused at two display sizes via CSS — larger (~128px) on the goal detail page, smaller (~48px) as a thumbnail on the goal list/card. No separate thumbnail asset set needed. Apply `image-rendering: pixelated` in CSS so both sizes stay crisp.

</specifics>

<deferred>
## Deferred Ideas

### Fallback / descope path (not deferred to a future phase — a contingency for THIS phase, see D-10)
- If time runs short before 2026-07-14, first cut: narrow offline scope back to transactions-only (drop goal/allocation offline actions from D-01). Pixel art states (5) stay fixed — states are not the second cut.

### Out-of-scope ideas (future phases / explicitly not this phase)
- Sync status indicator exact visual design — left to Claude's Discretion (not a vision-level gray area for this discussion).
- Per-goal-category pixel art themes (rejected in favor of D-05 generic single theme) — could revisit post-MVP if there's appetite for more visual variety.
- Manual "sync now" button — rejected in favor of D-04 fully-automatic sync; could be added post-MVP if auto-sync proves unreliable in the field.

</deferred>

---

*Phase: 4-Polish*
*Context gathered: 2026-07-10*
