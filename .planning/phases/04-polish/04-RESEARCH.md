# Phase 4: Polish - Research

**Researched:** 2026-07-10
**Domain:** Client-side offline write queue (IndexedDB) + auto-sync + idempotent backend writes; static-asset pixel-art rendering
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Offline scope is **broadened beyond the literal OFF-01 requirement text** (which says "transaksi") to include **goal create/edit and allocation confirm/skip**, all queued in IndexedDB and synced automatically on reconnect. This was a deliberate call after the tradeoff was flagged (higher conflict-handling complexity, tight 4-day timeline) — see D-06 (misnumbered in source; actually D-10) Fallback for the descope path if time runs out.
- **D-02:** A side-income transaction entered offline does **not** show the allocation suggestion modal immediately (SAW needs live server-side goal data). The suggestion modal appears **after that transaction successfully syncs** — user still gets full suggest-and-confirm, just deferred until sync completes.
- **D-03:** Every offline-queued write (transaction, goal action, allocation action) gets a **client-generated UUID as an idempotency key**. On sync, the backend checks this UUID to prevent duplicate inserts if a sync is retried (e.g., partial network failure, app restart mid-sync).
- **D-04:** Sync runs **automatically the moment the browser/Tauri WebView detects it's back online** (`online` event listener) — no manual "sync now" button required for MVP.
- **D-05:** Motif is a **growing plant**: biji (seed) → tunas (sprout) → tanaman muda (young plant) → tanaman berbunga (flowering) → pohon/tanaman berbuah penuh (full, fruiting). One **generic theme reused for every goal** regardless of goal category — not per-category art.
- **D-06:** Exactly **5 fixed states** at 0% / 25% / 50% / 75% / 100% (matches VIS-01's minimum). No finer-grained interpolation.
- **D-07:** Displayed in **both** the goal detail page (`apps/web/app/goals/[id]/page.tsx`) and the goal list/card view — same asset, rendered at two sizes via CSS, not two separate asset sets.
- **D-08:** Asset production is **manual (team-made), not sourced/generated**. A concrete asset guide (count, per-state description, file naming, dimensions) was produced during discuss-phase — see CONTEXT.md `<specifics>` — this is already speced, no research needed on asset sourcing.
- **D-09:** Work order is **offline sync first, pixel art last**. Rationale: offline queue + idempotency + conflict handling is the riskier/more technical piece — tackle it while there's still slack in the schedule. Pixel art is comparatively mechanical once assets exist and is safe to finish close to the wire.
- **D-10 — Fallback/descope order if time runs short before 2026-07-14:** First cut is **narrowing offline scope back down to transactions-only** (drop the D-01 broadening — goal/allocation offline actions get descoped, matching the original OFF-01 text), not shrinking pixel art states. Pixel art (5 states) and basic transaction offline-sync are the floor that must ship.
- **D-11:** Testing effort: **backend sync-endpoint tests are mandatory** (pytest, covering the idempotency/duplicate-prevention logic). Frontend (offline indicator UI, pixel art rendering) is verified via **manual UAT in browser + Tauri desktop**, no new frontend test framework introduced given the timeline.
- **Execution model:** This phase is executed **solo by Hidayat** (not split across the 4-person team) — no cross-team ownership table needed for planning.

### Claude's Discretion

- Sync status indicator (OFF-02) exact placement and visual treatment (e.g., small badge in header/nav vs. toast vs. banner) — implementation detail, not a vision call.
- IndexedDB schema design (object stores, indexes) for the offline queue — follows `idb` package conventions.
- Exact conflict-resolution mechanics beyond the idempotency-UUID rule (D-03) for goal/allocation offline actions (e.g., what happens if a goal was deleted server-side while an edit was queued offline) — technical edge case, resolve during planning/execution using reasonable last-write-wins or reject-and-notify semantics.
- Precise CSS/component structure for rendering the pixel art at two sizes (detail vs. card).
- Bahasa Indonesia copy for sync status states and offline banners.

### Deferred Ideas (OUT OF SCOPE)

- **Fallback/descope path** (not deferred to a future phase — a contingency for THIS phase, see D-10): If time runs short before 2026-07-14, first cut: narrow offline scope back to transactions-only (drop goal/allocation offline actions from D-01). Pixel art states (5) stay fixed — states are not the second cut.
- Sync status indicator exact visual design — left to Claude's Discretion (not a vision-level gray area for this discussion).
- Per-goal-category pixel art themes (rejected in favor of D-05 generic single theme) — could revisit post-MVP if there's appetite for more visual variety.
- Manual "sync now" button — rejected in favor of D-04 fully-automatic sync; could be added post-MVP if auto-sync proves unreliable in the field.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Smart Allocation always suggest-and-confirm, never auto-execute** (CLAUDE.md rule #4) — directly extends to D-02: the offline-synced side-income transaction still triggers the suggestion modal post-sync, never auto-allocates. Any sync-flow design that auto-allocates on successful sync would violate this non-negotiable rule.
- **Source labeling is server-side only** (CLAUDE.md rule #2) — the offline queue's transaction payload must never include a `source`/`source_label` field; only `kategori_id` is queued/sent, exactly like the existing online path. `_derive_transaction_fields()` in `transactions.py` must remain the single source of derivation for both online and offline-synced writes.
- **Static export for Tauri** — `next.config.ts` already has `output: "export"` + `images.unoptimized: true`; this phase's new code (offline queue, pixel art) must stay compatible with static export (no server-only APIs, no dynamic route handlers).
- **API contract changes require team communication** — if planning decides to add a new batched sync endpoint (see Open Question #1) or add `idempotency_key` to existing request bodies, this is an `API_CONTRACT.md` change and should be flagged even though execution is solo this phase (contract is still a living document read by the whole team).
- **Platform ownership** — Hidayat is sole account holder for Vercel/Railway/Supabase; this phase's new Postgres migration (`idempotency_key` column) requires Hidayat to run it via Supabase Dashboard SQL Editor, consistent with how migrations 001-007 were applied (per `backend/migrations/*.sql` header comments). No new env vars are anticipated (IndexedDB is client-only).
- **Team-scoped branches / no direct commits to main** — still applies even though this phase is solo-executed; work should land via the normal branch+PR flow per `.claude/CLAUDE.md` Architectural Constraints.
- **`apps/web/AGENTS.md` breaking-changes notice** — this Next.js installation (16.2.9) may differ from training-data assumptions; `output: "export"` + `images.unoptimized: true` are already correctly configured in this repo (verified by reading `next.config.ts` directly), and the client-only-API access pattern (`'use client'` + `useEffect`) used throughout this research was cross-checked against the official Next.js static-export guide, not assumed from stale training data.

## Summary

Phase 4 has two mostly-independent halves that share one theme: making the app trustworthy under imperfect conditions (offline network, tight demo timeline). The offline half (OFF-01/OFF-02) is the harder, riskier piece — it requires a browser-only persistence layer (IndexedDB via `idb`), a reconnect-triggered sync loop, and a backend that can absorb retried writes without creating duplicate financial records. The pixel-art half (VIS-01) is comparatively mechanical: swap one of 5 static PNGs based on `progress_pct`, already computed server-side and already present in the `Goal` API response — no new backend work needed at all.

The codebase is greenfield for both features: no `idb` dependency installed yet, no offline code anywhere in `apps/web/`, and no idempotency-key handling in any backend router. All three "offline-queueable" write endpoints already exist (`POST /api/transactions`, `POST /api/goals` + `PUT /api/goals/{id}`, `POST /api/allocations` + `POST /api/allocations/{id}/skip`) and follow a consistent FastAPI + Supabase (Postgres via supabase-py 2.31.0) pattern: server-derived fields, double-`.eq()` IDOR scoping, JWKS-verified JWT auth via `get_current_user_id`. The idempotency mechanism should slot into this existing pattern rather than replace it — add an `idempotency_key` column + a Postgres UNIQUE constraint per table, and have each write endpoint upsert-or-detect-conflict instead of blind-inserting.

`apps/web/next.config.ts` already has `output: "export"` and `images.unoptimized: true` set (done in Phase 1) — this phase does not need to touch static-export config. IndexedDB and `window.addEventListener('online'/'offline')` both work fine in a `'use client'` component wrapped in `useEffect`, matching the pattern the codebase already uses for `getToken()`/`localStorage` access. One important caveat surfaced in research and already flagged in ROADMAP.md: `navigator.onLine`/the browser `online` event is a known-unreliable signal for *true* internet connectivity inside Tauri's WebView (it can report `true` while actually offline) — for this phase's UX purpose (trigger a sync attempt, not gate a safety-critical action) this is an acceptable known limitation, not a blocker, since a failed sync attempt just leaves the item queued for the next `online` event or app restart.

**Primary recommendation:** Build a single `idb`-backed `offlineQueue` module with one unified `queue` object store (discriminated by a `kind` field — see Architecture Patterns Pattern 1), one shared `sync()` function triggered by the `online` event, and reuse the existing `apiMutate`/`apiUpload` functions in `lib/api/client.ts` unchanged for the actual network calls once online — just add an `idempotency_key` (client UUID) field to each request body and add matching UNIQUE-constraint + conflict-detection handling on the 5 backend write endpoints touched by the D-01 broadened scope.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Offline write persistence (queue) | Browser / Client | — | IndexedDB is browser/WebView-only storage; no server role |
| Online/offline detection | Browser / Client | — | `window` events; Tauri WebView is a browser context here, not a separate tier |
| Queue replay / sync orchestration | Browser / Client | API / Backend | Client decides *when* to sync; backend decides *whether* a given write is a duplicate |
| Idempotent write handling | API / Backend | Database / Storage | Backend receives the client UUID; Postgres UNIQUE constraint is the actual duplicate-prevention mechanism |
| Sync status indicator (offline/syncing/synced) | Browser / Client | — | Pure UI state derived from queue length + online status, no server round-trip needed to render it |
| Deferred allocation-suggestion modal (D-02) | Browser / Client | API / Backend | Client defers showing the modal until sync confirms; backend's existing `GET /allocation-suggestion` is unchanged, just called later |
| Pixel art rendering (VIS-01) | Browser / Client | — | Static asset selection by `progress_pct`, a value the API/Backend tier already computes and returns — no new backend logic |
| `progress_pct` computation | API / Backend | Database / Storage | Already implemented (`fetch_and_rank_goals` in `goal_service.py`) — Phase 4 only *consumes* this value, does not change it |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Progress setiap goal divisualisasikan dalam bentuk pixel art yang berubah seiring progress_pct bertambah | See "CSS Pixel-Art Rendering" and "Code Examples > Pixel Art State Selection" — 5 static PNGs already speced in CONTEXT.md Asset Guide; this research covers only the rendering mechanics (image-rendering: pixelated, `<img>` vs `next/image`) |
| OFF-01 | Transaksi yang diinput saat offline disimpan ke IndexedDB (via idb package); sync otomatis ke backend saat koneksi kembali | See "Standard Stack", "Architecture Patterns > IndexedDB Queue Schema", "Don't Hand-Roll", "Idempotency-Key Pattern" |
| OFF-02 | UI menampilkan status offline/syncing/synced yang jelas kepada user | See "Architecture Patterns > Sync Status State Machine" |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `idb` | 8.0.3 [VERIFIED: npm registry] | Promise-based wrapper over raw IndexedDB, TypeScript-typed schemas | Already named as the required package in CONTEXT.md D-01/D-03 and ROADMAP.md key risks; maintained by Jake Archibald (Google/Chrome DevRel), 20M+ weekly downloads, zero dependencies, ~1KB gzipped [VERIFIED: npm registry — `idb` package-legitimacy check returned OK, 20,386,122 weekly downloads, repo `github.com/jakearchibald/idb`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `uuid` (browser built-in `crypto.randomUUID()`) | n/a — Web Crypto API, no package needed | Generate the client-side idempotency key | Every offline-queued write; `crypto.randomUUID()` is available in all evergreen browsers and Tauri's WebView2/WebKit — no npm package required, avoids adding a dependency for something the platform already provides [ASSUMED — standard Web API, high confidence but not independently re-verified against Tauri's exact WebView2 build in this session] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `idb` | Raw `indexedDB.open(...)` API | Callback-based, verbose, error-prone transaction lifetime handling — explicitly what `idb` exists to avoid. Not worth hand-rolling for a 4-day timeline. |
| `idb` | `localforage`, `Dexie.js` | Both are heavier abstractions (Dexie adds its own query language; localforage abstracts across IndexedDB/WebSQL/localStorage). CONTEXT.md already locked `idb` (D-01) — no need to re-litigate. |
| Client `online` event | Service Worker + Background Sync API | ROADMAP.md key risk explicitly rules this out: "Service workers are unreliable inside the Tauri Android WebView" — and since MVP scope is Web + Tauri Desktop only (Android is post-MVP per CLAUDE.md), a service-worker-based approach would also add unnecessary complexity to the Vercel web deploy for no corresponding benefit this phase. |
| Postgres UNIQUE constraint + catch-conflict | Redis `SETNX` distributed lock | Redis is not part of the current stack (Supabase Postgres only) — adding a new infra dependency this close to the demo is unjustified when Postgres already gives atomic conflict detection via `ON CONFLICT`. |

**Installation:**
```bash
cd apps/web
npm install idb
```

**Version verification:** `npm view idb version` → `8.0.3`, last published 2025-05-07 [VERIFIED: npm registry]. This is current as of research date; no newer major version pending.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `idb` | npm | ~8 yrs (first published ~2017, current 8.0.3 published 2025-05-07) | 20,386,122/wk | `github.com/jakearchibald/idb` | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — `idb` is a well-established, high-download package with a known maintainer and no postinstall script found on registry lookup.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────── Browser / Tauri WebView ───────────────────────────┐
│                                                                                  │
│  User action (add transaction / edit goal / confirm-or-skip allocation)         │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────┐        online?        ┌──────────────────────────┐        │
│  │  Form submit     │──────── yes ─────────▶│  apiMutate() — direct    │───┐    │
│  │  handler         │                       │  network call (existing)│   │    │
│  └────────┬─────────┘                       └──────────────────────────┘   │    │
│           │ no (or write fails)                                            │    │
│           ▼                                                                │    │
│  ┌─────────────────────────┐                                               │    │
│  │  offlineQueue.enqueue() │  ← writes to IndexedDB via idb                │    │
│  │  (client UUID assigned) │                                               │    │
│  └────────┬─────────────────┘                                              │    │
│           │                                                                │    │
│           │  window 'online' event fires                                  │    │
│           ▼                                                                │    │
│  ┌─────────────────────────┐   replay queued items sequentially           │    │
│  │  offlineQueue.sync()    │───────────────────────────────────────────▶──┘    │
│  │  (status: syncing)      │   via apiMutate() + Idempotency-Key header        │
│  └────────┬─────────────────┘                                                  │
│           │  each item: success → delete from IndexedDB                        │
│           │              side-income txn → THEN fetch allocation-suggestion    │
│           │              (never before sync, per D-02)                         │
│           ▼                                                                    │
│  ┌─────────────────────────┐                                                   │
│  │  Sync status indicator   │  offline → syncing → synced (OFF-02)             │
│  │  (global, e.g. near nav) │                                                  │
│  └───────────────────────────┘                                                 │
│                                                                                  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                        │ HTTPS (Railway)
                                        ▼
┌──────────────────────────── FastAPI Backend (Railway) ─────────────────────────┐
│                                                                                  │
│  POST /api/transactions | /api/goals | /api/allocations  (existing routers)     │
│         │                                                                       │
│         ▼                                                                       │
│  Idempotency check: does idempotency_key already exist for this user+table?     │
│    │                                          │                                 │
│    │ no (new)                                 │ yes (retry)                    │
│    ▼                                          ▼                                 │
│  INSERT with UNIQUE(idempotency_key)    Return the ORIGINAL row/response        │
│  constraint → 201                        (idempotent no-op) → 200/201 same body │
│                                                                                  │
└─────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
                                        ▼
                              Supabase Postgres (existing tables + new column)
```

### Recommended Project Structure
```
apps/web/
├── lib/
│   ├── offline/
│   │   ├── db.ts              # idb openDB() call, schema, upgrade callback
│   │   ├── queue.ts           # enqueue(), sync(), listQueued(), status derivation
│   │   └── types.ts           # QueuedItem discriminated union (transaction | goal_action | allocation_action)
│   └── api/
│       └── client.ts          # EXISTING — extend apiMutate to accept an idempotencyKey param
├── components/
│   ├── SyncStatusIndicator.tsx   # new — OFF-02, mounts near BottomNav or root layout
│   └── ...
├── app/
│   ├── layout.tsx              # mount online/offline listener + queue init once, globally
│   ├── goals/
│   │   ├── [id]/page.tsx       # EXISTING — add pixel-art component here
│   │   └── page.tsx            # EXISTING — add pixel-art thumbnail per card here
│   └── ...
└── public/
    └── pixel-art/
        ├── goal-plant-0.png     # per CONTEXT.md Asset Guide (already speced)
        ├── goal-plant-25.png
        ├── goal-plant-50.png
        ├── goal-plant-75.png
        └── goal-plant-100.png

backend/
├── migrations/
│   └── 008_add_idempotency_keys.sql   # new — adds idempotency_key column + UNIQUE constraint to transaksi, goal, alokasi
├── routers/
│   ├── transactions.py         # EXISTING — extend create_transaction to accept + check idempotency_key
│   ├── goals.py                # EXISTING — extend create_goal/update_goal similarly
│   └── allocations.py          # EXISTING — extend confirm_allocation similarly
└── tests/
    ├── test_transactions.py    # EXISTING — add idempotency-retry test cases
    ├── test_goals.py           # EXISTING — same
    └── test_allocations.py     # EXISTING — same
```

### Pattern 1: IndexedDB Queue Schema (idb)
**What:** A single IndexedDB database with either 3 typed object stores (one per entity: `transaction`, `goal_action`, `allocation_action`) or 1 unified store with a `kind` discriminator field and a compound structure. Given all 3 entity types share the same lifecycle (enqueue → attempt sync → succeed/fail → retry), a **single store with a discriminated union value type** is simpler to iterate/sync in one loop than juggling 3 separate stores — recommended over 3 stores.

**When to use:** Any write action performed while offline (transaction create, goal create/edit, allocation confirm/skip per the broadened D-01 scope).

**Example:**
```typescript
// apps/web/lib/offline/types.ts
export type QueuedItem =
  | { id: string; kind: 'transaction'; payload: TransactionCreateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'goal_create'; payload: GoalCreateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'goal_update'; goalId: string; payload: GoalUpdateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'allocation_confirm'; payload: AllocationConfirmRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'allocation_skip'; transactionId: string; createdAt: string; attempts: number }

// apps/web/lib/offline/db.ts
// Source: idb 8.0.3 README pattern (github.com/jakearchibald/idb) — [CITED: github.com/jakearchibald/idb]
import { openDB, DBSchema } from 'idb'
import type { QueuedItem } from './types'

interface MacostOfflineDB extends DBSchema {
  queue: {
    key: string           // = QueuedItem.id (client UUID, doubles as idempotency key)
    value: QueuedItem
    indexes: { 'by-createdAt': string }
  }
}

export function getDB() {
  return openDB<MacostOfflineDB>('macost-offline', 1, {
    upgrade(db) {
      const store = db.createObjectStore('queue', { keyPath: 'id' })
      store.createIndex('by-createdAt', 'createdAt')
    },
  })
}
```

### Pattern 2: Enqueue-then-Sync
**What:** Every write path first tries the network (if `navigator.onLine` is true and the app believes it's connected); on failure OR when already known-offline, it writes to the IndexedDB queue instead and returns immediately so the UI doesn't block. A single `sync()` function, triggered by the `online` window event, drains the queue sequentially (not in parallel — sequential avoids goal/allocation ordering issues, e.g. a queued goal-create must land before a queued allocation targeting that same not-yet-synced goal).

**When to use:** All 3 offline-queueable actions (D-01 broadened scope).

**Example:**
```typescript
// apps/web/lib/offline/queue.ts
import { getDB } from './db'
import { apiMutate } from '@/lib/api/client'
import type { QueuedItem } from './types'

export async function enqueue(item: Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'>) {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.add('queue', { ...item, id, createdAt: new Date().toISOString(), attempts: 0 } as QueuedItem)
  return id
}

export async function sync(onProgress?: (status: 'syncing' | 'synced') => void) {
  const db = await getDB()
  const items = await db.getAllFromIndex('queue', 'by-createdAt')
  if (items.length === 0) return

  onProgress?.('syncing')
  for (const item of items) {
    try {
      await replayItem(item)              // calls apiMutate with Idempotency-Key = item.id
      await db.delete('queue', item.id)
    } catch (err) {
      // leave in queue for next online event / manual retry; increment attempts for diagnostics
      const updated = { ...item, attempts: item.attempts + 1 }
      await db.put('queue', updated)
      // do not throw — one failed item should not block the rest of the queue
    }
  }
  onProgress?.('synced')
}

window.addEventListener('online', () => { sync() })
```

### Pattern 3: Sync Status State Machine (OFF-02)
**What:** Three states — `offline` (browser/WebView reports no connection OR last sync attempt failed), `syncing` (queue drain in progress), `synced` (queue empty AND online). Derive this purely client-side from `navigator.onLine` + queue length — no new backend endpoint needed.
**When to use:** Global indicator, Claude's Discretion on placement per CONTEXT.md (near `BottomNav.tsx` or root layout is a reasonable default given `BottomNav` is already the persistent chrome across app pages).

### Pattern 4: Idempotency-Key Backend Handling
**What:** Client sends its queue-item UUID as the idempotency key on every offline-originated write. Backend stores it in a new `idempotency_key` column with a `UNIQUE(id_pengguna, idempotency_key)` constraint (scoped per-user, not globally — per research finding on idempotency-key scoping). On insert, catch the unique-violation and instead re-fetch + return the existing row so a retried sync is a safe no-op rather than a 500 or a duplicate.

**When to use:** `POST /api/transactions`, `POST /api/goals`, `PUT /api/goals/{id}`, `POST /api/allocations`, `POST /api/allocations/{id}/skip` — all 5 offline-queueable write endpoints (D-01 broadened scope).

**Example:**
```python
# backend/routers/transactions.py — illustrative extension pattern
# Source: general idempotency-key pattern [CITED: brandur.org/idempotency-keys] + supabase-py upsert docs [CITED: supabase.com/docs/reference/python/upsert]

# Migration: backend/migrations/008_add_idempotency_keys.sql
# ALTER TABLE public.transaksi ADD COLUMN idempotency_key UUID NULL;
# ALTER TABLE public.transaksi ADD CONSTRAINT transaksi_idempotency_unique
#     UNIQUE (id_pengguna, idempotency_key);
# (idempotency_key is NULLable — existing rows and non-offline-originated writes are unaffected;
#  a partial unique index `WHERE idempotency_key IS NOT NULL` is the Postgres-correct way to allow
#  many NULLs while still enforcing uniqueness among non-null values.)

def create_transaction(body: TransactionCreate, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase_admin()

    if body.idempotency_key:
        existing = (
            supabase.table("transaksi")
            .select("*")
            .eq("id_pengguna", current_user_id)
            .eq("idempotency_key", body.idempotency_key)
            .execute()
        ).data
        if existing:
            # Retry of an already-processed offline write — return the ORIGINAL
            # row unchanged, do not re-derive/re-insert (safe no-op).
            row = existing[0]
            allocation_suggestion_available = (
                row["tipe_transaksi"] == "Pemasukan" and row["source_label"] == "Flexible Side Income"
            )
            return {**_row_to_response(row), "allocation_suggestion_available": allocation_suggestion_available}

    # ... existing kategori lookup + insert logic unchanged, just add
    # "idempotency_key": body.idempotency_key to insert_payload
```

### Pattern 5: Deferred Allocation Suggestion After Offline Sync (D-02)
**What:** When a queued item is `kind: 'transaction'` AND the synced response has `allocation_suggestion_available: true`, the frontend queue-sync code — not the form submission code — is what triggers fetching `GET /api/transactions/{id}/allocation-suggestion` and opening the suggestion modal. This must NOT happen at enqueue time (SAW ranking needs live server-side goal data that doesn't exist client-side).
**When to use:** Only in the `sync()` replay path, never in the offline-enqueue path.

### Anti-Patterns to Avoid
- **Parallel queue replay (`Promise.all` over queued items):** Breaks ordering guarantees — e.g., a queued allocation confirm referencing a queued-but-not-yet-synced goal would fail if it races ahead of the goal-create sync. Replay sequentially.
- **Trusting `navigator.onLine` as a connectivity oracle:** It only reflects OS-level network adapter state, not actual internet reachability, and is documented as unreliable inside Tauri's WebView specifically [CITED: github.com/tauri-apps/tauri discussion #9269]. Acceptable here because a failed sync attempt is retried on the next `online` event or app restart — not acceptable if this signal were gating something safety-critical.
- **Re-deriving `tipe_transaksi`/`source_label` differently for offline-synced vs. online-created transactions:** The existing `_derive_transaction_fields()` helper in `transactions.py` must be reused unchanged — an idempotency-key check should wrap the existing logic, not fork a parallel code path (keeps CLAUDE.md rule #2 intact for both paths).
- **Storing the idempotency key only in the frontend queue, never persisting server-side:** Without the UNIQUE constraint the check is a race condition — two near-simultaneous sync attempts (e.g., app restarted mid-sync, second sync fires) could both pass a `SELECT`-then-`INSERT` check before either commits. The UNIQUE constraint is the actual safety mechanism; the `SELECT` check is only an optimization to avoid a wasted round-trip on the common case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| IndexedDB transaction lifetime management | Manual `indexedDB.open()` + `onupgradeneeded` + callback juggling | `idb` package | This is exactly the boilerplate `idb` exists to eliminate; hand-rolling it risks subtle transaction-autocommit bugs under a 4-day deadline |
| Duplicate-write prevention race conditions | Application-level "check-then-insert" without a DB constraint | Postgres `UNIQUE` constraint (+ partial index for nullable column) | A `SELECT` check followed by an `INSERT` is inherently racy — only a database-level constraint is atomic. This is a well-documented idempotency pattern, not something to reinvent [CITED: brandur.org/idempotency-keys] |
| True internet-connectivity detection | Custom polling/ping logic against the app's own backend | `window.addEventListener('online'/'offline')` (accepted limitation) OR (only if OFF-01 UX proves unreliable in testing) a lightweight Tauri Rust connectivity-probe command | Building a custom ping-based prober this late adds risk for a nice-to-have accuracy improvement the phase's UX doesn't strictly require — the browser `online` event is the pragmatic MVP choice, matching what most offline-capable web apps ship |

**Key insight:** Both hand-roll temptations in this phase (raw IndexedDB, custom duplicate-detection) have well-established, low-effort library/database-native solutions. The actual engineering risk in this phase is not "what library to use" but "getting the sequencing and idempotency-key plumbing correct across 5 endpoints under time pressure" — which is why Pattern 4 (Idempotency-Key Backend Handling) should be built once as a small reusable helper (e.g., `backend/services/idempotency.py`) rather than copy-pasted 5 times with subtle drift.

## Runtime State Inventory

> This phase is additive (new tables columns, new frontend module), not a rename/refactor/migration phase. Included per protocol for completeness, all categories verified empty or N/A.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing renamed/migrated entities in this phase; `idempotency_key` is a new nullable column, not a rename | None |
| Live service config | None — no n8n/Datadog/Tailscale/Cloudflare Tunnel in this project's stack | None |
| OS-registered state | None — no Windows Task Scheduler/pm2/launchd/systemd usage found in this project | None |
| Secrets/env vars | None anticipated — IndexedDB is client-only, no new env var; confirmed no new Railway/Vercel/Supabase config needed (per CONTEXT.md canonical_refs) | None |
| Build artifacts | None — no package renames in this phase; `idb` is a net-new dependency addition, not a replacement of an existing one | None |

**Nothing found in any category** — verified via grep across the repo for offline/idb/pixel-art code (confirmed zero matches, per CONTEXT.md code_context) and via review of `.claude/CLAUDE.md` Platform Requirements (no scheduled tasks, no external service configs beyond Vercel/Railway/Supabase which are unaffected by this phase).

## Common Pitfalls

### Pitfall 1: IndexedDB unavailable during SSR/static-export prerender
**What goes wrong:** Calling `openDB()` or `indexedDB.open()` at module scope (outside a `'use client'` component's `useEffect`) crashes the Next.js static-export build, because `indexedDB` does not exist in the Node.js build environment.
**Why it happens:** `next build` with `output: "export"` still executes component code in a Node context to prerender static HTML; any top-level browser-API access throws `ReferenceError: indexedDB is not defined`.
**How to avoid:** Only call `getDB()` / `enqueue()` / `sync()` from inside `useEffect` or event handlers in `'use client'` components — never at module top-level or during render. This matches the existing pattern already used for `getToken()` (`apps/web/lib/auth/session.ts`) and `localStorage` access in this codebase.
**Warning signs:** Build fails with `ReferenceError: indexedDB is not defined` or `window is not defined` during `npm run build`.

### Pitfall 2: `navigator.onLine` false positives inside Tauri WebView
**What goes wrong:** The app believes it's online (fires a sync attempt) when the Tauri desktop machine actually has no internet route, wasting time and potentially confusing the sync-status indicator (flickering "syncing" → failure → back to "offline").
**Why it happens:** `navigator.onLine` in WebView2/most WebViews only reflects whether a network adapter is "up" (e.g., connected to WiFi), not whether that network route reaches the internet — a known, documented limitation, not Tauri-specific but pronounced in embedded WebViews [CITED: github.com/tauri-apps/tauri discussions #9269].
**How to avoid:** Treat a failed sync attempt as expected and silent-retryable (Pattern 2 already does this — failed items stay queued, no user-facing error spam). Do not treat `online` event firing as a guarantee of success; only treat *actual sync completion* as truth for the "synced" status.
**Warning signs:** Sync status flickers between "syncing" and "offline" repeatedly during manual UAT on a flaky connection.

### Pitfall 3: Sequential vs. parallel sync corrupting cross-entity ordering
**What goes wrong:** A user offline creates Goal A, then immediately (still offline) confirms an allocation targeting Goal A. If sync replays these in parallel or out of order, the allocation-confirm request could hit the backend before Goal A exists server-side, causing a 404 `NOT_FOUND` (`_goal_not_found()` in `allocations.py`) even though the user's actions were logically valid.
**Why it happens:** IndexedDB's `getAllFromIndex` used with the `by-createdAt` index (Pattern 1/2) preserves insertion order, but only if sync consumes the array sequentially with `await` inside a `for...of` loop — a `Promise.all`/`.map()` would fire all requests concurrently and lose that ordering guarantee.
**How to avoid:** Always `await` each `replayItem()` call sequentially before proceeding to the next queued item (already shown correctly in Pattern 2's example).
**Warning signs:** Intermittent 404s on allocation-confirm sync that don't reproduce when tested item-by-item.

### Pitfall 4: Idempotency key column without a partial unique index breaks legacy/non-offline rows
**What goes wrong:** If the migration adds `UNIQUE(id_pengguna, idempotency_key)` as a plain constraint without accounting for `NULL`, this is actually safe in Postgres (multiple `NULL`s are allowed under a standard UNIQUE constraint — NULLs are never considered equal to each other) — but only if the column is truly nullable and every non-offline write path explicitly sends `null`/omits the field. A plan that assumes `idempotency_key` is `NOT NULL` would force retrofitting every non-offline call site.
**Why it happens:** Easy to conflate "idempotency key is required" (true for offline writes) with "idempotency key is required at the schema level" (false — must stay nullable so existing/online writes keep working unmodified).
**How to avoid:** Keep the column `NULL`-able in the migration; Pydantic model field should be `idempotency_key: str | None = None`; only offline-queue-originated requests populate it.
**Warning signs:** Existing online-write tests (e.g., `test_transactions.py`'s current suite) start failing after the migration lands, because they don't send an `idempotency_key`.

### Pitfall 5: Pixel art asset not crisp at both display sizes
**What goes wrong:** The 64×64px source PNG renders blurry when scaled up to ~128px (detail page) or down to ~48px (card thumbnail) if `image-rendering: pixelated` isn't applied, or if `next/image`'s automatic sizing interferes with nearest-neighbor scaling.
**Why it happens:** Browsers default to bilinear/smooth image scaling; pixel art needs explicit `image-rendering: pixelated` CSS to force nearest-neighbor scaling and preserve hard pixel edges [CITED: developer.mozilla.org/en-US/docs/Web/CSS/image-rendering].
**How to avoid:** Apply `image-rendering: pixelated;` (with the `-moz-crisp-edges` fallback for older Firefox) directly on the `<img>`/`<Image>` element rendering the pixel-art asset, at both display sizes. Test on the actual Tauri desktop WebView2 build, not just the browser dev server, since this is a Windows-desktop-targeted MVP.
**Warning signs:** Pixel art looks blurry/anti-aliased instead of crisp/blocky during manual UAT.

## Code Examples

### Pixel Art State Selection
```typescript
// Source: derived from CONTEXT.md D-06/D-07 (5 fixed states, generic function)
// apps/web/components/GoalPixelArt.tsx (illustrative — planner/executor finalizes exact component boundaries)

const STATES = [0, 25, 50, 75, 100] as const

function pixelArtState(progressPct: number): typeof STATES[number] {
  // Clamp + floor-to-nearest-defined-state; goals can exceed 100% in theory
  // (over-allocation), so cap at 100 rather than looking up an undefined asset.
  const clamped = Math.min(Math.max(progressPct, 0), 100)
  // Pick the highest state threshold that is <= clamped value
  return [...STATES].reverse().find((s) => clamped >= s) ?? 0
}

export function GoalPixelArt({ progressPct, size }: { progressPct: number; size: 'detail' | 'card' }) {
  const state = pixelArtState(progressPct)
  const px = size === 'detail' ? 128 : 48
  return (
    <img
      src={`/pixel-art/goal-plant-${state}.png`}
      alt={`Progress tanaman goal: ${state}%`}
      width={px}
      height={px}
      style={{ imageRendering: 'pixelated', width: px, height: px }}
    />
  )
}
```
Note: a plain `<img>` (not `next/image`) is used here deliberately — with `images.unoptimized: true` already set repo-wide, `next/image`'s main remaining benefit (CLS-prevention via width/height) is trivially achievable with a plain `<img>`'s own `width`/`height` attributes, and it sidesteps any risk of Next's Image wrapper interfering with the `image-rendering: pixelated` CSS on small fixed-size assets [CITED: nextjs.org/docs/app/api-reference/components/image — unoptimized mode retains layout-shift prevention and lazy loading but drops resize/format conversion, so the delta vs. plain `<img>` for this specific use case is small]. Either choice is defensible; this is a planner/executor judgment call, not a hard constraint.

### IndexedDB Queue Init (idb)
```typescript
// Source: idb 8.0.3 official pattern — [CITED: github.com/jakearchibald/idb README "Wrapper API"]
import { openDB, type DBSchema } from 'idb'

interface MacostOfflineDB extends DBSchema {
  queue: {
    key: string
    value: {
      id: string
      kind: 'transaction' | 'goal_create' | 'goal_update' | 'allocation_confirm' | 'allocation_skip'
      payload: unknown
      createdAt: string
      attempts: number
    }
    indexes: { 'by-createdAt': string }
  }
}

let dbPromise: ReturnType<typeof openDB<MacostOfflineDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MacostOfflineDB>('macost-offline', 1, {
      upgrade(db) {
        const store = db.createObjectStore('queue', { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Service Worker + Background Sync API for offline queueing | Direct IndexedDB queue + `online` event listener | N/A — project-specific choice, not an industry-wide shift | ROADMAP.md already documents this as a deliberate choice: Background Sync API has patchy Safari/WebView support and service workers are unreliable in Tauri's Android WebView; since MVP scope excludes Android anyway (per CLAUDE.md), a service-worker approach would add complexity without matching benefit for Web+Desktop-only scope |

**Deprecated/outdated:** None specific to this phase's stack — `idb` 8.x, FastAPI 0.138, and Postgres UNIQUE-constraint idempotency are all current, actively-maintained approaches as of research date.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` is available and reliable in Tauri's bundled WebView2 (Windows) without a polyfill | Standard Stack > Supporting | Low — WebView2 is Chromium-based and has supported `crypto.randomUUID()` since Chromium 92 (2021); if wrong, `uuid` npm package is a trivial one-line fallback |
| A2 | A single unified `queue` object store with a `kind` discriminator is preferable to 3 separate object stores | Architecture Patterns > Pattern 1 | Low — this is an architectural preference, not a correctness claim; 3 separate stores would also work, just with slightly more duplicated sync-loop code. Planner/executor can override during planning. |
| A3 | Sequential (not parallel) sync replay is necessary to preserve goal-then-allocation ordering | Common Pitfalls > Pitfall 3 | Medium — if wrong (e.g., backend is made robust to out-of-order refs via retry), sequential-only is just a performance cost, not a correctness bug; but the D-01 broadened scope means this ordering risk is real and worth defending against regardless |
| A4 | Plain `<img>` is an acceptable (not just tolerable) choice over `next/image` for the pixel-art assets given `unoptimized: true` is already set | Code Examples > Pixel Art State Selection | Low — this is explicitly flagged as a judgment call in the same section, not presented as the only correct choice |

## Open Questions

1. **Should offline sync use a new batched `/api/sync` endpoint, or replay existing single-item endpoints sequentially client-side?**
   - What we know: All 5 target endpoints already exist and work; a batched endpoint would require new backend design + a new API_CONTRACT.md section (explicitly flagged by the discuss-phase context as a possible contract addition, not decided).
   - What's unclear: Whether batching offers enough of a UX/reliability win (single round-trip, atomic all-or-nothing potential) to justify new backend surface area under a 4-day timeline, versus the simplicity of reusing `apiMutate` unchanged per queued item.
   - Recommendation: **Default to client-side sequential replay of existing single-item endpoints** (Pattern 2) for MVP — it requires zero new backend routes, zero API_CONTRACT.md changes beyond adding `idempotency_key` to the 3 existing request bodies, and keeps the failure/retry semantics per-item (one bad item doesn't block the rest of the queue, matching Pattern 2's error handling). A batched endpoint can be a fast-follow post-MVP optimization if manual UAT reveals the sequential approach is too slow with many queued items. Flag this as a planning-time decision to confirm with Hidayat, not a locked research conclusion.

2. **Exact object-store design: 1 unified store vs. 3 typed stores?**
   - What we know: Both are viable with `idb`; CONTEXT.md leaves this to Claude's Discretion.
   - What's unclear: Whether the planner prefers stronger TypeScript discrimination via 3 separate typed stores (cleaner `db.getAll('transactions')` etc.) vs. simpler unified iteration for the sync loop (Pattern 1's recommendation).
   - Recommendation: Use the unified `queue` store with a `kind` discriminator (Pattern 1) — simpler sync loop, single source of ordering truth via one `by-createdAt` index. This is Assumption A2, low risk either way.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build (`npm install idb`, `npm run build`) | ✓ (per `.claude/CLAUDE.md` Platform Requirements) | >= 20 | — |
| npm | Package install | ✓ | — | — |
| Python 3.12 / venv | Backend migration + idempotency logic | ✓ (`backend/venv/`, supabase-py 2.31.0 confirmed installed) | 3.12 | — |
| Supabase Postgres | New `idempotency_key` column + UNIQUE constraint migration | ✓ (live, per STATE.md — Supabase project provisioned since 2026-07-04) | — | — |
| Tauri desktop build environment | Manual UAT of offline queue + pixel art on Windows WebView2 | ✓ (per STATE.md — Tauri desktop build previously verified working) | Tauri 2.0 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none — all required tooling already present and verified working in prior phases per STATE.md.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (backend only — `backend/tests/`, existing `pytest.ini` with `testpaths = backend/tests`) |
| Config file | `backend/pytest.ini` |
| Quick run command | `python -m pytest backend/tests/test_transactions.py backend/tests/test_goals.py backend/tests/test_allocations.py -x` (run from repo root — per STATE.md, bare `pytest` breaks imports; must use `python -m pytest`) |
| Full suite command | `python -m pytest` (from repo root) |

Per CONTEXT.md D-11: frontend (offline indicator UI, pixel art rendering) is manual-UAT only — no new frontend test framework introduced this phase. This section therefore covers backend sync-endpoint tests only.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OFF-01 | `POST /api/transactions` with a new `idempotency_key` creates exactly one row | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency -x` | ❌ Wave 0 (new test cases in existing file) |
| OFF-01 | `POST /api/transactions` retried with the SAME `idempotency_key` returns the original row, does not create a duplicate | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency_retry -x` | ❌ Wave 0 |
| OFF-01 | `POST /api/goals` and `PUT /api/goals/{id}` follow the same idempotency-key no-op-on-retry behavior | unit | `python -m pytest backend/tests/test_goals.py -k idempotency -x` | ❌ Wave 0 |
| OFF-01 | `POST /api/allocations` follows the same idempotency-key no-op-on-retry behavior (critical — this is the money-moving endpoint per `allocations.py`'s own comment "THE ONLY write path into `alokasi`") | unit | `python -m pytest backend/tests/test_allocations.py -k idempotency -x` | ❌ Wave 0 |
| OFF-01 | Idempotency key is scoped per-user — user A's key does not collide-detect against user B's identical key value | unit | `python -m pytest backend/tests/test_transactions.py -k idempotency_cross_user -x` | ❌ Wave 0 |
| VIS-01 | Pixel art state selection function maps `progress_pct` correctly at boundaries (0, 24, 25, 49, 50, 74, 75, 99, 100, >100) | manual-UAT only per D-11 | — (visual check in browser + Tauri desktop) | n/a |
| OFF-02 | Sync status indicator shows offline/syncing/synced correctly across a real network-drop test | manual-UAT only per D-11 | — (manual: disable network, add transaction, re-enable, observe indicator + eventual sync) | n/a |

### Sampling Rate
- **Per task commit:** `python -m pytest backend/tests/test_transactions.py backend/tests/test_goals.py backend/tests/test_allocations.py -x` (fast, scoped to touched routers)
- **Per wave merge:** `python -m pytest` (full backend suite, from repo root)
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus manual UAT checklist for VIS-01/OFF-02 in both browser and Tauri desktop build (per D-11)

### Wave 0 Gaps
- [ ] `backend/migrations/008_add_idempotency_keys.sql` — new migration, must run before any idempotency test can pass against a real Supabase instance (fake test client in `conftest.py` may need updating too — check whether `_FakeQuery` needs an `.upsert()`/conflict-detection method added to simulate the UNIQUE constraint for unit tests that don't hit real Postgres)
- [ ] New idempotency test cases across `test_transactions.py`, `test_goals.py`, `test_allocations.py` (existing files, new test functions — no new test files needed)
- [ ] Confirm whether `backend/tests/conftest.py`'s `_FakeQuery`/`_FakeSupabaseClient` fake needs a conflict-simulation capability, since it currently mimics `.insert()`/`.update()`/`.eq()` but likely has no unique-constraint enforcement — without this, idempotency-retry tests may need to assert against explicit application-level duplicate-check logic rather than relying on a raised DB exception, OR the fake needs a small extension. Flag as a planning-time decision.

*(No frontend test gaps — per D-11, frontend is manual-UAT only, no new framework.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (unchanged) | Existing JWKS-verified Supabase JWT via `get_current_user_id` (`backend/dependencies/auth.py`) — no new auth surface this phase |
| V3 Session Management | no | No session changes in this phase |
| V4 Access Control | yes | Idempotency-key lookups MUST be scoped with `.eq("id_pengguna", current_user_id)` in addition to `.eq("idempotency_key", ...)` — same double-`.eq()` IDOR-safe pattern already used throughout `transactions.py`/`goals.py`/`allocations.py`. Without the user-scoping, a guessed/leaked UUID from another user's queue could theoretically be replayed to read/short-circuit into their data (low practical risk since UUIDs are client-generated and effectively unguessable, but the constraint should still be `UNIQUE(id_pengguna, idempotency_key)`, never a bare `UNIQUE(idempotency_key)`, to fully close this off) |
| V5 Input Validation | yes | `idempotency_key` field on `TransactionCreate`/`GoalCreate`/`GoalUpdate`/`AllocationConfirmRequest` Pydantic models should be typed `str | None = None` with a UUID format validation (Pydantic's `UUID4` type or a regex) to reject malformed keys early rather than let them reach the DB constraint |
| V6 Cryptography | no | No new cryptographic operations — `crypto.randomUUID()` is a standard browser API, not a security-sensitive crypto operation for this use case (idempotency keys are not secrets) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Duplicate financial writes on retried sync (double-charging a goal, double-counting a transaction) | Repudiation / Tampering (data integrity) | Postgres UNIQUE constraint on `(id_pengguna, idempotency_key)` — this IS the core purpose of this phase's idempotency work, not an afterthought |
| Cross-user idempotency-key collision (IDOR via IndexedDB queue tampering) | Elevation of Privilege / Information Disclosure | Scope the UNIQUE constraint AND every lookup query to `id_pengguna`, never a bare global unique index on `idempotency_key` alone (see V4 above) |
| Offline queue data at rest on a shared/borrowed device (IndexedDB is unencrypted local storage) | Information Disclosure | Out of scope for this phase per CONTEXT.md/ROADMAP.md — no mention of encryption-at-rest requirements for the offline queue; existing app already stores JWT in localStorage/tauri-plugin-store without additional encryption, so this is consistent with the project's existing risk posture, not a regression. Flagging for awareness only, not a blocking finding. |

## Sources

### Primary (HIGH confidence)
- None — no MCP documentation tools (Context7, ref, jina, etc.) were available in this session; all findings are `[CITED]` (web search confirmed against official/authoritative pages) or `[VERIFIED: npm registry]` (package legitimacy check) rather than `[VERIFIED: <tool>]` from a direct docs-fetch tool.

### Secondary (MEDIUM confidence)
- [idb README](https://github.com/jakearchibald/idb) — openDB/DBSchema/object store API shape
- [Next.js Static Exports guide](https://nextjs.org/docs/app/guides/static-exports) — client-only API access pattern (`useEffect` + `'use client'`)
- [Next.js Image component reference](https://nextjs.org/docs/app/api-reference/components/image) — `unoptimized` behavior
- [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering) — `pixelated` value cross-browser support
- [Tauri GitHub Discussion #9269](https://github.com/orgs/tauri-apps/discussions/9269) — `navigator.onLine` unreliability inside Tauri WebView
- [Supabase Python upsert docs](https://supabase.com/docs/reference/python/upsert) — `on_conflict` parameter usage
- [Idempotency Keys in Postgres — brandur.org](https://brandur.org/idempotency-keys) — canonical idempotency-key + UNIQUE constraint pattern
- `npm view idb version` — direct registry query, confirmed 8.0.3
- `gsd-tools query package-legitimacy check` — confirmed `idb` OK verdict (20.3M weekly downloads, known repo)

### Tertiary (LOW confidence)
- `crypto.randomUUID()` availability claim (A1 in Assumptions Log) — based on general Web Platform knowledge, not independently re-verified against the exact WebView2 build Tauri bundles on this project's target Windows environment

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — `idb` version/legitimacy is verified via registry tooling (high confidence on that specific fact), but no direct API-docs-fetch tool was available this session, so API usage patterns rely on web-search-corroborated training knowledge rather than a live docs fetch
- Architecture: MEDIUM — patterns are internally consistent with the existing codebase's established conventions (double-`.eq()` IDOR pattern, server-derived fields, `apiMutate`/`apiFetch` split) and align with CONTEXT.md's locked decisions, but the exact object-store/endpoint-batching shape is a recommendation, not a verified-only-correct design
- Pitfalls: MEDIUM — Pitfall 2 (Tauri WebView online-event unreliability) is directly corroborated by a Tauri maintainer/community discussion; other pitfalls are derived from general web-development knowledge applied to this specific codebase's patterns

**Research date:** 2026-07-10
**Valid until:** 2026-07-17 (7 days — fast-moving enough given the imminent 2026-07-14 demo date; also `idb`/Next.js/FastAPI version currency should be re-checked if planning is delayed past that date)
