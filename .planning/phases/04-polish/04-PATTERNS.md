# Phase 4: Polish - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 16 (new) + 8 (modified)
**Analogs found:** 20 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `apps/web/lib/offline/db.ts` | utility | event-driven (IndexedDB init) | *(none — greenfield)* | no analog (use RESEARCH.md Pattern 1) |
| `apps/web/lib/offline/types.ts` | model (client) | transform | `apps/web/lib/api/types.ts` | role-match |
| `apps/web/lib/offline/queue.ts` | service (client) | event-driven / batch | `apps/web/lib/api/client.ts` | role-match |
| `apps/web/components/SyncStatusIndicator.tsx` | component | event-driven | `apps/web/components/BottomNav.tsx` | role-match |
| `apps/web/components/GoalPixelArt.tsx` | component | request-response (static asset render) | `apps/web/app/goals/page.tsx` (progress bar block) | role-match |
| `apps/web/app/layout.tsx` (modify) | provider/root layout | event-driven (mount listeners) | itself (currently scaffold) | exact (extend in place) |
| `apps/web/app/goals/page.tsx` (modify) | component | CRUD read | itself | exact (extend in place) |
| `apps/web/app/goals/[id]/page.tsx` (modify) | component | CRUD read | itself | exact (extend in place) |
| `apps/web/components/TransactionForm.tsx` (modify) | component | request-response → enqueue fallback | itself | exact (extend in place) |
| `apps/web/public/pixel-art/goal-plant-{0,25,50,75,100}.png` | static asset | file-I/O | *(none — design asset, team-drawn)* | no analog |
| `backend/migrations/008_add_idempotency_keys.sql` | migration | batch (DDL) | `backend/migrations/005_create_alokasi.sql` | exact |
| `backend/services/idempotency.py` | service | CRUD (helper) | `backend/services/allocation_service.py` | role-match |
| `backend/routers/transactions.py` (modify) | controller/route | CRUD + idempotent-write | itself (`create_transaction`) | exact (extend in place) |
| `backend/routers/goals.py` (modify) | controller/route | CRUD + idempotent-write | itself (`create_goal`/`update_goal`) | exact (extend in place) |
| `backend/routers/allocations.py` (modify) | controller/route | CRUD + idempotent-write | itself (`confirm_allocation`) | exact (extend in place) |
| `backend/models/transaction.py` (modify) | model | validation | itself (`TransactionCreate`) | exact (extend in place) |
| `backend/models/goal.py` (modify) | model | validation | `backend/models/transaction.py` | role-match |
| `backend/models/allocation.py` (modify) | model | validation | `backend/models/transaction.py` | role-match |
| `backend/tests/test_transactions.py` (modify) | test | unit | itself | exact (extend in place) |
| `backend/tests/test_goals.py` (modify) | test | unit | `backend/tests/test_transactions.py` | role-match |
| `backend/tests/test_allocations.py` (modify) | test | unit | `backend/tests/test_transactions.py` | role-match |
| `backend/tests/conftest.py` (modify) | test fixture / fake DB | CRUD (in-memory fake) | itself (`_FakeQuery`) | exact (extend in place) |
| `API_CONTRACT.md` (modify) | config/contract doc | n/a | itself | exact (extend in place) |

## Pattern Assignments

### `apps/web/lib/offline/db.ts` (utility, event-driven)

**Analog:** none in codebase (greenfield — first IndexedDB usage). Use RESEARCH.md "IndexedDB Queue Init (idb)" code block verbatim as the starting point; the important *codebase convention* to preserve is the lazy-singleton pattern already used for client-only resources.

**Convention to match — lazy client-only singleton** (see `apps/web/lib/auth/session.ts` usage in `apps/web/app/goals/page.tsx` lines 6, 71-75): `getToken()` is called only inside `useEffect`/event handlers, never at module scope. `getDB()` must follow the same rule — call only from `'use client'` components' `useEffect` or from queue.ts functions invoked at runtime, never at import time (Pitfall 1 in RESEARCH.md — `next build` with `output: "export"` prerenders in Node and has no `indexedDB` global).

```typescript
// Pattern to follow (RESEARCH.md, verified against idb 8.0.3 README)
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

---

### `apps/web/lib/offline/types.ts` (model, transform)

**Analog:** `apps/web/lib/api/types.ts` (not read in full this pass — referenced via imports in `apps/web/app/goals/page.tsx` line 7: `import type { GoalsResponse, Goal, GoalSettings } from '@/lib/api/types'` and `apps/web/app/goals/[id]/page.tsx` line 7 `GoalDetailResponse`, line 64 `isApiErrorBody`).

**Convention to match:** existing API types are plain `interface`/`type` exports, consumed via `import type`. `QueuedItem` should follow the same style — a discriminated union exported as a named type, mirroring how `Goal`/`GoalSettings` are separately-named exports rather than one large namespace object.

```typescript
// apps/web/lib/offline/types.ts — discriminated union per RESEARCH.md Pattern 1
export type QueuedItem =
  | { id: string; kind: 'transaction'; payload: TransactionCreateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'goal_create'; payload: GoalCreateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'goal_update'; goalId: string; payload: GoalUpdateRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'allocation_confirm'; payload: AllocationConfirmRequest; createdAt: string; attempts: number }
  | { id: string; kind: 'allocation_skip'; transactionId: string; createdAt: string; attempts: number }
```

Reuse existing request-body types from `apps/web/lib/api/types.ts` (e.g. whatever type `TransactionForm.tsx` already builds for `apiMutate('/api/transactions', 'POST', body)`) rather than redefining new shapes — check `TransactionForm.tsx`'s submit handler for the exact existing request type name before writing `types.ts`.

---

### `apps/web/lib/offline/queue.ts` (service, event-driven/batch)

**Analog:** `apps/web/lib/api/client.ts` — specifically the `apiMutate` function (lines 207-238) and its error-handling convention (`throwResponseError`, lines 131-142).

**Imports pattern** (client.ts lines 1-28, adapt for queue.ts):
```typescript
import { getToken, clearToken } from "@/lib/auth/session";
```
queue.ts should import `apiMutate` directly rather than re-implementing fetch:
```typescript
import { apiMutate } from '@/lib/api/client'
import { getDB } from './db'
import type { QueuedItem } from './types'
```

**Core enqueue/sync pattern** (RESEARCH.md Pattern 2, matches `apiMutate`'s method signature convention of `(path, method, body, token?)` — lines 207-212 of client.ts):
```typescript
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
  for (const item of items) {          // sequential — never Promise.all (Pitfall 3)
    try {
      await replayItem(item)            // calls apiMutate(...) with idempotency_key in body
      await db.delete('queue', item.id)
    } catch {
      const updated = { ...item, attempts: item.attempts + 1 }
      await db.put('queue', updated)     // stays queued, no throw — one bad item doesn't block rest
    }
  }
  onProgress?.('synced')
}
```

**Error handling pattern:** Reuse `apiMutate`'s existing `throwResponseError`/`isAuthError` (client.ts lines 122-142) unchanged — do NOT write a parallel error-parsing path in queue.ts. A 401 during sync should call `clearToken()` exactly as `apiMutate` already does internally, then the caller (queue.ts) just catches and leaves the item queued for next attempt (per Pattern 2 above — no special-case 401 handling needed beyond what `apiMutate` already does).

**Deferred allocation modal (D-02):** Only in the `sync()` replay path — when `kind === 'transaction'` and reply includes `allocation_suggestion_available: true`, fetch `GET /api/transactions/{id}/allocation-suggestion` via `apiFetch` (client.ts lines 158-189) and surface the modal — mirrors how `AllocationSuggestionModal.tsx`/`SmartAllocationModal.tsx` are presumably triggered today from the online path in `TransactionForm.tsx` (check that file's submit handler for the existing trigger point before duplicating logic).

---

### `apps/web/components/SyncStatusIndicator.tsx` (component, event-driven)

**Analog:** `apps/web/components/BottomNav.tsx` (full file read — 108 lines).

**Imports pattern** (BottomNav.tsx lines 1-3):
```typescript
'use client'
import { useRouter } from 'next/navigation'
```
SyncStatusIndicator should follow the same `'use client'` directive + no-default-export-props-interface convention:
```typescript
'use client'
import { useEffect, useState } from 'react'
```

**Styling convention** (BottomNav.tsx lines 74-107): inline Tailwind utility classes combined with a `style={{...}}` object for exact hex colors (project doesn't use a Tailwind config with named brand colors — colors are ad-hoc hex/rgba inline, e.g. `'#298dff'`, `'rgba(30,30,30,0.45)'`). Match this exactly — do not introduce a new color token system.

**Mount point:** Per CONTEXT.md Claude's Discretion + RESEARCH.md Pattern 3 recommendation — mount near `BottomNav` usage or in root layout. `apps/web/app/layout.tsx` (read, lines 69-82) is currently the **unmodified Next.js scaffold** — no existing global client-side mount point exists yet. This will be the first non-scaffold addition to `layout.tsx`; needs a `'use client'` wrapper component (RootLayout itself is a Server Component per current code — cannot add `useEffect` directly to it) — e.g. add a small client child component `<OfflineSyncProvider>` inside the `<body>` that owns the `online` listener + renders `SyncStatusIndicator`.

**Component props convention** (BottomNav.tsx lines 66-69):
```typescript
interface BottomNavProps {
  activeTab: string
}
export default function BottomNav({ activeTab }: BottomNavProps) { ... }
```
Follow the same named-interface + default-export-function pattern for `SyncStatusIndicator`.

---

### `apps/web/components/GoalPixelArt.tsx` (component, request-response/static asset)

**Analog:** `apps/web/app/goals/page.tsx` — the progress-bar rendering block (lines 300-317 for Priority#1 card, lines 370-379 for standard card) is the closest existing "derive visual state from `progress_pct`" logic in the codebase.

**Core pattern to copy — reading `progress_pct` off the `Goal` type** (goals/page.tsx line 307, 375):
```tsx
style={{ width: `${Math.min(goal.progress_pct, 100)}%`, ... }}
```
GoalPixelArt should use the identical `Math.min(goal.progress_pct, 100)` clamp convention (also matches RESEARCH.md's `pixelArtState()` clamp) rather than inventing a new clamping approach.

**Component to build** (RESEARCH.md Code Examples > Pixel Art State Selection — use as-is, already aligned with this codebase's conventions):
```tsx
const STATES = [0, 25, 50, 75, 100] as const

function pixelArtState(progressPct: number): typeof STATES[number] {
  const clamped = Math.min(Math.max(progressPct, 0), 100)
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

**Mount points:**
- `apps/web/app/goals/page.tsx` — insert next to the icon-ring block (lines 261-264, 331-333) per-card, size='card'.
- `apps/web/app/goals/[id]/page.tsx` — insert in the detail page's header/hero area (not yet read past line 80 — planner should locate the equivalent progress display block there before finalizing placement), size='detail'.

**Styling convention:** plain `<img>` not `next/image` (matches RESEARCH.md's explicit recommendation given `images.unoptimized: true` is already set) — also consistent with this codebase's existing pattern of using raw inline `<svg>` elements (BottomNav.tsx) rather than Next's asset-optimization components for small UI graphics.

---

### `backend/migrations/008_add_idempotency_keys.sql` (migration, batch/DDL)

**Analog:** `backend/migrations/005_create_alokasi.sql` (partial read, lines 1-20).

**Header convention** (005 lines 1-3):
```sql
-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 005_create_alokasi
-- Purpose: Create alokasi (allocation) table with RLS policies
```
008 must follow the identical 3-line header format:
```sql
-- Run via: Supabase Dashboard -> SQL Editor -> paste and execute
-- Migration: 008_add_idempotency_keys
-- Purpose: Add idempotency_key column + partial UNIQUE constraint to transaksi, goal, alokasi
```

**Structure to follow** (per RESEARCH.md Pattern 4 + Pitfall 4 — nullable column + partial unique index, NOT a plain `NOT NULL` or bare `UNIQUE`):
```sql
ALTER TABLE public.transaksi ADD COLUMN idempotency_key UUID NULL;
CREATE UNIQUE INDEX transaksi_idempotency_unique
    ON public.transaksi (id_pengguna, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
-- repeat for public.goal and public.alokasi
```
Note: existing table DDL (005) uses `CREATE TABLE IF NOT EXISTS` + inline `CHECK`/`REFERENCES` constraints — this migration is `ALTER TABLE`, a new shape not yet seen in 001-007, but the file-naming/header/RLS-policy-block conventions still apply if the migration also needs any RLS touch (unlikely here since existing RLS policies already scope by `id_pengguna`, which is untouched).

---

### `backend/services/idempotency.py` (service, CRUD helper)

**Analog:** `backend/services/allocation_service.py` (not read this pass, but referenced via `backend/routers/allocations.py` line 9: `from backend.services import allocation_service, goal_service`) — role-match as a thin service module imported by routers, following the `backend/services/` flat-module convention already established (`saw_engine.py`, `goal_service.py`, `statement_service.py`).

**Pattern to follow** (derived from `_derive_transaction_fields` helper in `transactions.py` lines 27-36 — a small, single-purpose, router-imported helper function, NOT a class):
```python
# backend/services/idempotency.py
def check_idempotency(supabase, table: str, current_user_id: str, idempotency_key: str | None) -> dict | None:
    """Returns the existing row if idempotency_key was already processed for
    this user+table, else None. Callers MUST scope by id_pengguna (V4/IDOR —
    see RESEARCH.md Security Domain) — never a bare idempotency_key lookup."""
    if not idempotency_key:
        return None
    rows = (
        supabase.table(table)
        .select("*")
        .eq("id_pengguna", current_user_id)
        .eq("idempotency_key", idempotency_key)
        .execute()
    ).data
    return rows[0] if rows else None
```
This directly mirrors the double-`.eq()` IDOR-safe query pattern already used pervasively in `transactions.py` (lines 71-76, 199-205, 232-236) and `allocations.py` (lines 78-84). Building this once as a shared helper (per RESEARCH.md "Don't Hand-Roll" key insight) avoids copy-paste drift across 5 endpoints.

---

### `backend/routers/transactions.py` (modify — controller, CRUD + idempotent-write)

**Analog:** itself — `create_transaction` (lines 58-125), already fully read.

**Imports pattern** (lines 1-15) — add:
```python
from backend.services.idempotency import check_idempotency
```

**Core pattern to extend** (lines 58-125) — insert idempotency check immediately after deriving `tipe_transaksi`/`source_label` (line 91), BEFORE the insert (line 115), per RESEARCH.md Pattern 4:
```python
if body.idempotency_key:
    existing = check_idempotency(supabase, "transaksi", current_user_id, body.idempotency_key)
    if existing:
        allocation_suggestion_available = (
            existing["tipe_transaksi"] == "Pemasukan" and existing["source_label"] == "Flexible Side Income"
        )
        return {**_row_to_response(existing), "allocation_suggestion_available": allocation_suggestion_available}
```
Then add `"idempotency_key": body.idempotency_key` to `insert_payload` (line 101-113) — mirrors the existing style of building a flat dict literal for `insert_payload`, do not switch to a different payload-construction style.

**Error handling pattern:** unchanged — existing `HTTPException` + structured `{"error": {"code": ..., "message": ...}}` detail dicts (lines 78-86) are the established convention; no new error path is needed for the idempotency check itself (a hit is a 200/201 success, not an error).

**Anti-pattern to avoid (from RESEARCH.md):** do NOT fork `_derive_transaction_fields()` into a separate "offline" derivation path — the existing single function (lines 27-36) must remain the only place `tipe_transaksi`/`source_label` are computed, for both online and offline-synced writes (CLAUDE.md rule #2).

---

### `backend/routers/goals.py` (modify — controller, CRUD + idempotent-write)

**Analog:** itself — `create_goal` (lines 39-64) and `update_goal` (lines 100-120+, partially read).

**Pattern to extend:** identical shape to transactions.py above — add `idempotency_key` check before insert in `create_goal`, and before update in `update_goal`. Note `update_goal` already uses the double-`.eq()` IDOR pattern (`id_goal` + `id_pengguna`, visible at the point the read was cut off around line 120) — the idempotency check for `update_goal` should use the SAME double-`.eq()` shape via the shared `check_idempotency()` helper, scoped to table `"goal"`.

---

### `backend/routers/allocations.py` (modify — controller, CRUD + idempotent-write, CRITICAL path)

**Analog:** itself — `confirm_allocation` (starts line 100, partially read through line 120).

**Pattern to extend:** Per RESEARCH.md's explicit flag — this is "the money-moving mutation" (comment already in the file, lines 96-99) and per D-11 this endpoint's idempotency test is described as the most-critical test case ("THE ONLY write path into `alokasi`"). Apply the same `check_idempotency(supabase, "alokasi", current_user_id, body.idempotency_key)` guard before the insert into `alokasi`, using the same IDOR double-scoping already present in this file's existing lookups (lines 77-84 pattern for `_transaction_not_found`/`_goal_not_found` guards).

**Also needed:** `POST /api/allocations/{id}/skip` (referenced in RESEARCH.md's endpoint list, not yet located in the partial read) — locate this endpoint in the rest of `allocations.py` and apply the same idempotency guard if it performs a write (skip may just be a status flag update, not an insert — verify before assuming identical shape).

---

### `backend/models/transaction.py`, `goals.py`, `allocation.py` (modify — model, validation)

**Analog:** `backend/models/transaction.py`'s existing `tipe_transaksi: str | None = None` field pattern (lines 12-18) — a nullable, backward-compatible field addition with an explanatory comment tying it to a specific decision ID.

**Pattern to copy exactly:**
```python
# Add to TransactionCreate, GoalCreate, GoalUpdate, AllocationConfirmRequest:
idempotency_key: str | None = None  # D-03 (04-CONTEXT.md) — client-generated UUID,
    # used by the backend to no-op a retried offline-queue sync (see
    # backend/services/idempotency.py). Nullable — online/non-offline callers
    # omit this field entirely (Pitfall 4, 04-RESEARCH.md).
```
Per RESEARCH.md Security Domain (V5), consider `pydantic.UUID4` type instead of bare `str` for stricter validation — check whether the existing codebase uses `UUID4` anywhere else in `models/` before introducing it (not observed in `transaction.py`'s current imports — `from pydantic import BaseModel, Field` only, no `UUID4` import yet).

---

### `backend/tests/test_transactions.py`, `test_goals.py`, `test_allocations.py` (modify — test, unit)

**Analog:** `backend/tests/test_transactions.py` (partial read, lines 1-60) — full existing pattern already established for this exact scenario type.

**Imports pattern** (lines 1-16) — no new imports needed; idempotency tests reuse `_build_app()`, `_client_as()`, `fake_supabase_client` fixture exactly as-is.

**Test structure to copy** (lines 46-60, function signature convention):
```python
def test_post_transaction_derives_tipe_transaksi_and_source_label_from_kategori(
    monkeypatch, fake_supabase_client
):
    fake_supabase_client.seed("kategori", [FREELANCE_KATEGORI])
    monkeypatch.setattr(transactions, "get_supabase_admin", lambda: fake_supabase_client)
    app = _build_app()
    client = _client_as("user-1", app)
    # ... POST + assert
```
New idempotency tests should follow this exact signature/setup shape:
```python
def test_post_transaction_with_idempotency_key_creates_once(monkeypatch, fake_supabase_client):
    ...
def test_post_transaction_retried_idempotency_key_returns_original_no_duplicate(monkeypatch, fake_supabase_client):
    ...
def test_idempotency_key_scoped_per_user_no_cross_user_collision(monkeypatch, fake_supabase_client):
    ...
```

---

### `backend/tests/conftest.py` (modify — test fixture / fake DB)

**Analog:** itself — `_FakeQuery` class (lines 21-70+, partial read through `.execute()`'s insert-handling branch).

**Gap flagged in RESEARCH.md Wave 0:** `_FakeQuery` currently has no unique-constraint enforcement (`.insert()` at line 61-68 just appends unconditionally). Two options, matching the existing fake's minimalist style (it deliberately mimics only "the subset of the interface actually used," per its docstring lines 21-24):
1. Add a lightweight `_check_unique(table, columns)` helper invoked inside `.execute()`'s insert branch that raises a Python exception mimicking a Postgres unique-violation — OR
2. Rely purely on application-level `check_idempotency()` pre-check (the SELECT-then-INSERT optimization per RESEARCH.md Pattern 4) and don't simulate the DB constraint in the fake at all, since the application code already guards against the common case and the fake doesn't need full parity for unit tests to pass.

**Recommendation for planner:** Option 2 is lower-effort and consistent with the fake's existing minimal-mimicry philosophy — the real DB-level UNIQUE constraint is the actual safety net (verified only against real Supabase, out of scope for these unit tests), while these pytest cases validate the application-level `check_idempotency()` guard.

## Shared Patterns

### Server-derived fields / never trust client (CLAUDE.md rule #2)
**Source:** `backend/routers/transactions.py` lines 27-36 (`_derive_transaction_fields`)
**Apply to:** All 3 modified routers — the idempotency addition must wrap around this existing derivation, never fork a parallel derivation path for offline-synced writes.

### IDOR-safe double-`.eq()` scoping
**Source:** `backend/routers/transactions.py` lines 232-236, `backend/routers/allocations.py` lines 78-84
**Apply to:** `check_idempotency()` helper and all 5 modified write endpoints — every idempotency-key lookup must scope by `id_pengguna` AND the key, never a bare key lookup (Security Domain V4 in RESEARCH.md).

### Structured error responses
**Source:** `backend/routers/transactions.py` lines 78-86, `backend/routers/allocations.py` lines 15-45
**Apply to:** Any new error paths in the 3 modified routers — `{"error": {"code": "...", "message": "..."}}` shape, matching `CLAUDE.md` Error Handling section exactly.

### `'use client'` + `useEffect`-only browser-API access
**Source:** `apps/web/app/goals/page.tsx` lines 1, 69-79 (`getToken()` called only inside `useEffect`)
**Apply to:** `apps/web/lib/offline/db.ts`, `queue.ts`, `SyncStatusIndicator.tsx`, and the new `layout.tsx` client wrapper — IndexedDB/`window.addEventListener` calls must never execute at module top-level or during server-side prerender (Pitfall 1, RESEARCH.md).

### Inline hex/rgba styling (no Tailwind color tokens)
**Source:** `apps/web/components/BottomNav.tsx` lines 76-107, `apps/web/app/goals/page.tsx` lines 108-121
**Apply to:** `SyncStatusIndicator.tsx` and any new UI in `GoalPixelArt.tsx` wrapper markup — match the existing ad-hoc `style={{ backgroundColor: '#298dff' }}` convention rather than introducing Tailwind theme colors.

### `apiMutate`/`apiFetch` reuse for network calls
**Source:** `apps/web/lib/api/client.ts` lines 158-238
**Apply to:** `queue.ts`'s `replayItem()` — must call the existing `apiMutate` function unchanged (just add `idempotency_key` to the body), never hand-roll a parallel `fetch()` call.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/lib/offline/db.ts` | utility | event-driven | No IndexedDB code exists anywhere in the codebase yet (confirmed greenfield per CONTEXT.md/RESEARCH.md) — use RESEARCH.md's verified `idb` code block directly, adapted to the lazy-singleton convention from `session.ts`. |
| `apps/web/public/pixel-art/goal-plant-*.png` | static asset | file-I/O | Team-drawn art asset, not code — no code analog applies; see CONTEXT.md Asset Guide for the full spec (5 states, 64x64px, transparent PNG, `apps/web/public/pixel-art/goal-plant-{state}.png` naming). |
| `backend/services/idempotency.py` | service | CRUD helper | No existing cross-cutting idempotency helper in `backend/services/` — closest role-match (`allocation_service.py`) wasn't read in full this pass; recommend planner skim it briefly to confirm module-level docstring/style conventions before writing, but the function-shape pattern above (mirroring `_derive_transaction_fields`) is sufficient to start. |

## Metadata

**Analog search scope:** `apps/web/lib/api/`, `apps/web/components/`, `apps/web/app/goals/`, `apps/web/app/layout.tsx`, `backend/routers/`, `backend/services/`, `backend/models/`, `backend/migrations/`, `backend/tests/`
**Files scanned:** 24 read/partially-read (client.ts, BottomNav.tsx, goals/page.tsx, goals/[id]/page.tsx, layout.tsx, transactions.py, goals.py, allocations.py (partial), transaction.py model, 005_create_alokasi.sql (partial), test_transactions.py (partial), conftest.py (partial))
**Pattern extraction date:** 2026-07-10
