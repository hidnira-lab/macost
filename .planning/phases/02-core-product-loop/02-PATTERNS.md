# Phase 2: Core Product Loop - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 22
**Analogs found:** 22 / 22 (all role-match or exact; no true 0-analog files — greenfield backend follows `wallets.py`/`wallet.py` precedent directly, greenfield frontend follows `wallets/page.tsx` + `client.ts`/`types.ts` precedent directly)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/routers/transactions.py` | controller/route | CRUD + request-response | `backend/routers/wallets.py` | role-match (extends with derive-on-write logic) |
| `backend/routers/goals.py` | controller/route | CRUD + request-response | `backend/routers/wallets.py` | role-match (extends with batched-aggregation reads) |
| `backend/routers/goal_settings.py` | controller/route | CRUD (get-or-create + update) | `backend/routers/wallets.py` (PUT handler) | role-match |
| `backend/routers/allocations.py` | controller/route | request-response + event-driven (suggest→confirm/skip) | `backend/routers/wallets.py` | partial-match (new suggest/confirm/skip flow has no existing analog in repo) |
| `backend/routers/dashboard.py` | controller/route | CRUD (read-only aggregation) | `backend/routers/wallets.py` (`list_wallets` GET pattern) | role-match |
| `backend/routers/categories.py` | controller/route | CRUD (read-only) | `backend/routers/wallets.py` (`list_wallets` GET pattern) | role-match |
| `backend/models/transaction.py` | model | transform (Pydantic validation) | `backend/models/wallet.py` | exact |
| `backend/models/goal.py` | model | transform | `backend/models/wallet.py` | exact |
| `backend/models/goal_settings.py` | model | transform (+ custom validator) | `backend/models/wallet.py` | role-match (needs new `field_validator` — no analog for that in repo, see Research Pitfall 7) |
| `backend/models/allocation.py` | model | transform | `backend/models/wallet.py` | role-match |
| `backend/models/category.py` | model | transform (read-only) | `backend/models/wallet.py` | role-match |
| `backend/services/saw_engine.py` | service | transform (pure function) | none (new module type) — see RESEARCH.md "SAW Engine — Core Algorithm" for full pseudocode | no analog — use RESEARCH.md code directly |
| `backend/services/allocation_service.py` | service | transform + CRUD orchestration | none (new module type) — see RESEARCH.md "Full-flow allocation service sketch" | no analog — use RESEARCH.md code directly |
| `backend/migrations/002-007_*.sql` | migration | batch (DDL) | `backend/migrations/001_create_dompet.sql` | exact |
| `apps/web/app/transactions/page.tsx` | component (page) | CRUD + request-response | `apps/web/app/wallets/page.tsx` | exact |
| `apps/web/app/goals/page.tsx` | component (page) | CRUD + request-response | `apps/web/app/wallets/page.tsx` | exact |
| `apps/web/app/goals/[id]/page.tsx` | component (page) | request-response (detail read) | `apps/web/app/wallets/page.tsx` (read + render pattern) | role-match |
| `apps/web/app/goals/new/page.tsx` | component (page) | CRUD (create/edit form) | `apps/web/app/wallets/page.tsx` (`handleAddWallet` form pattern) | exact |
| `apps/web/app/allocations/pending/page.tsx` | component (page) | request-response (list read) | `apps/web/app/wallets/page.tsx` (list-render pattern) | role-match |
| `apps/web/app/dashboard/page.tsx` | component (page) | request-response (aggregated read) | `apps/web/app/wallets/page.tsx` (init/load pattern) | role-match |
| `apps/web/components/TransactionForm.tsx` | component | CRUD (form) | `apps/web/app/wallets/page.tsx` (`handleAddWallet` inline form) | role-match |
| `apps/web/components/AllocationSuggestionModal.tsx` | component | event-driven (suggest→confirm/skip) | none (new interaction pattern) — see RESEARCH.md "Frontend Integration Pattern" | no analog — use RESEARCH.md code directly |
| `apps/web/components/EmptyState.tsx` | component | transform (pure render) | `apps/web/app/wallets/page.tsx` line 148-155 (`wallets.length === 0` inline empty message) | role-match |
| `apps/web/lib/api/client.ts` (extend `resolveMock`) | utility | request-response (mock/real switch) | itself — extend existing `resolveMock()` switch, already has goals/transactions/allocation-suggestion/dashboard cases wired | exact (already scaffolded) |
| `apps/web/lib/api/types.ts` (extend) | model/types | transform | itself — Phase 2 interfaces already fully scaffolded (Transaction, Goal, GoalSettings, AllocationSuggestionResponse, DashboardResponse, etc.) | exact (already scaffolded) |

## Pattern Assignments

### `backend/routers/transactions.py` (controller, CRUD + request-response)

**Analog:** `backend/routers/wallets.py` (full file, 134 lines)

**Imports pattern** (lines 1-6):
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.wallet import WalletCreate, WalletUpdate, WalletResponse
```
→ Mirror exactly, swapping `wallet` imports for `transaction` model imports.

**Auth pattern:** `current_user_id: str = Depends(get_current_user_id)` on every handler — reuse verbatim, no changes needed (already JWKS-based, working end-to-end).

**Core CRUD + server-derive pattern** — do NOT copy from `wallets.py` verbatim for POST (wallets has no derive-from-related-row step); instead use RESEARCH.md "Pattern 1: Server-derived fields, never client-writable" (lines 228-255 of 02-RESEARCH.md) as the canonical POST handler:
```python
@router.post("/transactions", status_code=201)
def create_transaction(body: TransactionCreate, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase_admin()
    kategori = (
        supabase.table("kategori").select("*").eq("id_kategori", body.kategori_id).execute()
    ).data[0]
    tipe_transaksi = kategori["tipe"]
    source_label = kategori["flag_pemasukan"] if tipe_transaksi == "Pemasukan" else None
    result = supabase.table("transaksi").insert({
        "id_pengguna": current_user_id,
        "tipe_transaksi": tipe_transaksi,
        "source_label": source_label,
        "nominal": body.nominal,
        "tanggal_transaksi": body.tanggal_transaksi,
        "dompet_id": body.dompet_id,
        "kategori_id": body.kategori_id,
        "catatan": body.catatan,
    }).execute()
    row = result.data[0]
    allocation_suggestion_available = tipe_transaksi == "Pemasukan" and source_label == "Flexible Side Income"
    return {**row, "allocation_suggestion_available": allocation_suggestion_available}
```

**IDOR pattern for GET/PUT/DELETE** — copy `wallets.py` lines 92-98 and 129-131 exactly (double `.eq("id_X", x).eq("id_pengguna", current_user_id)`), applied to `transaksi`/`id_transaksi`.

**Error handling pattern** (`wallets.py` lines 100-104): `HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "..."}})` — reuse this exact structured-error shape for all new routers (matches `CLAUDE.md`'s prescribed error body).

**204 delete pattern** (`wallets.py` lines 119-133): `Response(status_code=status.HTTP_204_NO_CONTENT)` after a double-`.eq()` delete — copy verbatim for `DELETE /api/transactions/{id}` and `DELETE /api/goals/{id}` (with the Pitfall 10 cascade-block check added for goals).

---

### `backend/routers/goals.py` (controller, CRUD + request-response)

**Analog:** `backend/routers/wallets.py` (structure) + RESEARCH.md "Pattern 2: Batched aggregation" (lines 261-281)

**Core aggregation pattern** — do not do per-goal loops; copy this exactly:
```python
goals = supabase.table("goal").select("*").eq("id_pengguna", uid).execute().data
goal_ids = [g["id_goal"] for g in goals]
alokasi_rows = (
    supabase.table("alokasi").select("goal_id, nominal_alokasi")
    .in_("goal_id", goal_ids).execute().data
    if goal_ids else []
)
sums: dict[str, int] = {}
for row in alokasi_rows:
    sums[row["goal_id"]] = sums.get(row["goal_id"], 0) + row["nominal_alokasi"]
for g in goals:
    g["nominal_terkumpul"] = sums.get(g["id_goal"], 0)
    g["progress_pct"] = round(100 * g["nominal_terkumpul"] / g["nominal_target"]) if g["nominal_target"] else 0
```
Then pass `goals` through `saw_engine.rank_goals(goals, weights, strategy)` before returning — `rank` and `skor_kepentingan` (via `compute_skor_kepentingan`, RESEARCH.md lines 376-389) are computed fresh on every read, never persisted (Pitfall 6).

**CRUD skeleton (create/update/list):** same shape as `wallets.py` `create_wallet`/`update_wallet`/`list_wallets` — swap table name `dompet`→`goal`, response model `WalletResponse`→`GoalResponse`.

**Delete-with-guard pattern (Pitfall 10):** unlike `wallets.py`'s unconditional delete, check for existing `alokasi` rows first and block with a structured error if found:
```python
existing = supabase.table("alokasi").select("id_alokasi").eq("goal_id", goal_id).execute().data
if existing:
    raise HTTPException(status_code=400, detail={"error": {"code": "GOAL_HAS_ALLOCATIONS", "message": "Goal ini punya riwayat alokasi, tidak bisa dihapus"}})
```

---

### `backend/routers/goal_settings.py` (controller, CRUD)

**Analog:** `backend/routers/wallets.py` `update_wallet` (PUT pattern, lines 80-112)

**Get-or-create-default pattern** (new — no existing analog, follow this):
```python
row = supabase.table("goal_settings").select("*").eq("id_pengguna", current_user_id).execute().data
if not row:
    default = {"id_pengguna": current_user_id, "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}
    row = supabase.table("goal_settings").insert(default).execute().data
```

**Weight-sum validator** (Pitfall 7, no analog in repo — new pattern for `backend/models/goal_settings.py`):
```python
from pydantic import BaseModel, field_validator

class GoalSettingsUpdate(BaseModel):
    strategy: str
    weights: dict[str, float]

    @field_validator("weights")
    @classmethod
    def validate_weight_sum(cls, v):
        if abs(sum(v.values()) - 1.0) >= 0.001:
            raise ValueError("weights must sum to 1.0")
        return v
```

---

### `backend/routers/allocations.py` (controller, event-driven suggest→confirm/skip)

**Analog:** `backend/routers/wallets.py` (auth/error conventions only) + RESEARCH.md "Full-flow allocation service sketch" (lines 578-590+) for the actual suggestion logic — no direct structural analog exists in the repo for a suggest-then-confirm-or-skip flow.

**Core pattern to copy from RESEARCH.md:**
```python
def get_allocation_suggestion(transaction: dict, current_user_id: str) -> dict:
    goals = fetch_and_rank_goals(current_user_id)  # uses saw_engine.rank_goals()
    if not goals:
        return {"has_active_goal": False}
    top_goal = goals[0]
    suggested_pct = 35
    suggested_amount = round(transaction["nominal"] * suggested_pct / 100)
    return {...}
```
Confirm (`POST /api/allocations`) and skip (`POST /api/allocations/{id}/skip`) endpoints should reuse the double-`.eq()` IDOR guard and structured-error conventions from `wallets.py`. **Never auto-execute** — insert into `alokasi` only fires on explicit confirm call (CLAUDE.md constraint).

**Open item:** pending/skip state modeling is unresolved (RESEARCH.md "Open Question #1") — planner must pick either a `skipped_suggestion` table or an implicit-derivation approach before this file can be fully speced.

---

### `backend/services/saw_engine.py` (service, pure transform)

**No analog** — copy directly from RESEARCH.md "SAW Engine — Core Algorithm" and "SAW-02 edge case guards" (lines 302-354) and "SAW Strategy Toggle Mechanism" (lines 356-367). Key excerpts:
```python
def normalize_benefit(values: list[float]) -> list[float]:
    m = max(values)
    if m == 0:
        return [1.0 for _ in values]
    return [v / m for v in values]

def normalize_cost(values: list[float]) -> list[float]:
    m = min(values)
    return [1.0 if v == 0 else m / v for v in values]

def rank_goals(goals: list[dict], weights: dict, strategy: str = "quick_win") -> list[dict]:
    n = len(goals)
    if n == 0:
        return []
    if n == 1:
        g = dict(goals[0]); g["rank"] = 1
        return [g]
    # ... normalize per-criterion, weighted sum, sort by strategy-specific key,
    # tie-break created_at ASC ...
```
Must be a pure function: `list[Goal] -> list[Goal with rank]`, unit-testable for n=0/1/identical-values per SAW-02.

---

### `apps/web/app/transactions/page.tsx`, `goals/page.tsx`, `goals/new/page.tsx` (component/page, CRUD)

**Analog:** `apps/web/app/wallets/page.tsx` (full file, 284 lines) — this IS the canonical frontend page template for this phase.

**Imports pattern** (lines 1-7):
```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken, clearToken } from '@/lib/auth/session'
import type { WalletsResponse, Wallet } from '@/lib/api/types'
```

**Auth-guard-on-mount pattern** (lines 36-46):
```tsx
useEffect(() => {
  async function init() {
    const token = await getToken()
    if (!token) { router.push('/login'); return }
    await loadWallets()
  }
  init()
}, [router, loadWallets])
```

**Load-list pattern** (lines 25-34):
```tsx
const loadWallets = useCallback(async () => {
  try {
    const data = await apiFetch<WalletsResponse>('/api/wallets')
    setWallets(data.wallets)
  } catch {
    setError('Gagal memuat daftar dompet')
  } finally {
    setLoading(false)
  }
}, [])
```

**Create/mutate pattern** (lines 53-69) — same shape applies to `TransactionForm` submit handler and Goal create form:
```tsx
async function handleAddWallet(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setError(null)
  setAddLoading(true)
  try {
    const wallet = await apiMutate<Wallet>('/api/wallets', 'POST', { nama_dompet: newName })
    setWallets((prev) => [...prev, wallet])
  } catch {
    setError('Gagal menambah dompet')
  } finally {
    setAddLoading(false)
  }
}
```

**Empty-state pattern (D-06 direct precedent)** (lines 148-155):
```tsx
{wallets.length === 0 && !loading && (
  <p className="text-[#fcfcfc]/40 text-sm text-center py-8" style={{ fontFamily: 'Helvetica, sans-serif' }}>
    Belum ada dompet. Tambahkan dompet pertamamu!
  </p>
)}
```
→ Extract this into the shared `EmptyState.tsx` component per D-06, parameterized by message + CTA.

**Error banner pattern** (lines 134-144) — reuse verbatim for all new pages.

**Delete-with-confirm pattern** (lines 89-98):
```tsx
async function handleDelete(id: string) {
  if (!window.confirm('Hapus dompet ini? Tindakan ini tidak dapat dibatalkan.')) return
  ...
  await apiMutate<Record<string, never>>(`/api/wallets/${id}`, 'DELETE', null)
}
```

**Styling conventions to replicate:** dark theme (`bg-[#1e1e1e]`), `Helvetica`/`Neulis` font families via inline `style`, `#ff8929` accent for primary actions, `#298dff` for edit/links, `text-red-400` for destructive actions — Figma is source of truth for exact new layouts, but these tokens are the established baseline until Figma frames are pulled per-page.

---

### `apps/web/components/AllocationSuggestionModal.tsx` (component, event-driven)

**No direct analog** — copy the sequencing logic directly from RESEARCH.md "Frontend Integration Pattern" (lines 479-510):
```tsx
async function handleSaveTransaction(formData: TransactionCreateRequest) {
  setSaving(true)
  try {
    const created = await apiMutate<Transaction>('/api/transactions', 'POST', formData)
    await refreshTransactionList()
    if (created.allocation_suggestion_available) {
      setShowAllocationOverlay(true) // "Menghitung saran alokasi..."
      try {
        const suggestion = await apiFetch<AllocationSuggestionResponse>(
          `/api/transactions/${created.id_transaksi}/allocation-suggestion`
        )
        setShowAllocationOverlay(false)
        if (suggestion.has_active_goal) {
          openAllocationModal(suggestion)
        } else {
          openCreateGoalPrompt()
        }
      } catch {
        setShowAllocationOverlay(false)
        showToast('Gagal memuat saran alokasi. Cek nanti di halaman Pending.')
      }
    }
  } finally {
    setSaving(false)
  }
}
```
**Critical constraint:** No client-side `setTimeout`/`AbortController` timeout (D-04) — overlay must stay until fetch settles either way.

## Shared Patterns

### Authentication (backend)
**Source:** `backend/dependencies/auth.py` (full file)
**Apply to:** Every new router file (`transactions.py`, `goals.py`, `goal_settings.py`, `allocations.py`, `dashboard.py`, `categories.py`)
```python
current_user_id: str = Depends(get_current_user_id)
```
No changes needed — JWKS-based verification already works end-to-end.

### Authentication (frontend)
**Source:** `apps/web/lib/auth/session.ts` (`getToken()`), used in `apps/web/app/wallets/page.tsx` lines 38-42
**Apply to:** Every new page — guard on mount, redirect to `/login` if no token.

### Supabase client access
**Source:** `backend/core/supabase.py`
**Apply to:** Every new router/service — always `get_supabase_admin()`, never a per-request client. RLS is a backstop only; the actual enforcement is the double `.eq()` filter in every query (Pitfall 3).

### IDOR / ownership guard
**Source:** `backend/routers/wallets.py` lines 92-98, 129-131
**Apply to:** All GET/PUT/DELETE on `transaksi`, `goal`, `alokasi` — always `.eq("id_X", x).eq("id_pengguna", current_user_id)`.

### Structured error responses
**Source:** `backend/routers/wallets.py` lines 100-104
**Apply to:** All new routers.
```python
raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "..."}})
```

### Mock-vs-real API split
**Source:** `apps/web/lib/api/client.ts` (`resolveMock()`, `apiFetch`, `apiMutate`) — already fully scaffolded with goals/transactions/allocation-suggestion/dashboard/wallets mock routes wired.
**Apply to:** All new frontend pages — reads go through `apiFetch` (mockable), writes through `apiMutate` (always real). No changes needed to `client.ts` itself unless a new mock path (e.g. `/api/allocations/pending`, `/api/goal-settings`) needs a `resolveMock()` case added.

### TypeScript types
**Source:** `apps/web/lib/api/types.ts` — all Phase 2 interfaces (`Transaction`, `Goal`, `GoalSettings`, `AllocationSuggestionResponse`, `DashboardResponse`, etc.) are already fully defined matching API_CONTRACT.md. No new type-authoring needed; just import from here.

### Server-derived, never-client-writable fields
**Source:** RESEARCH.md "Pattern 1" (lines 224-255); extends the existing `flag_pemasukan`→`source_label` pattern already used in Phase 1.
**Apply to:** `transactions.py` POST/PUT (`tipe_transaksi`, `source_label`), `goals.py` GET (`skor_kepentingan`, `nominal_terkumpul`, `progress_pct`, `rank`).

### Batched aggregation (no N+1)
**Source:** RESEARCH.md "Pattern 2" (lines 257-281)
**Apply to:** `goals.py` (progress), any wallet-balance recomputation for `transactions.py` (Pitfall 9).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/services/saw_engine.py` | service | transform (pure function) | No ranking/scoring service exists yet anywhere in the codebase — use RESEARCH.md pseudocode directly (SAW-01/02/03 sections) |
| `backend/services/allocation_service.py` | service | CRUD orchestration + transform | No suggest-and-confirm service exists yet — use RESEARCH.md "Full-flow allocation service sketch" |
| `apps/web/components/AllocationSuggestionModal.tsx` | component | event-driven | No modal/overlay component exists yet in the codebase — use RESEARCH.md "Frontend Integration Pattern" sequencing logic; visual layout must come from Figma frame per CLAUDE.md UI workflow |
| `backend/routers/allocations.py` (suggest/confirm/skip sub-flow specifically) | controller | event-driven | Structural conventions (auth, error shape, IDOR) come from `wallets.py`, but the suggest→confirm-or-skip state machine itself has no precedent in this repo |

## Metadata

**Analog search scope:** `backend/routers/`, `backend/models/`, `backend/dependencies/`, `backend/core/`, `backend/migrations/`, `apps/web/app/`, `apps/web/lib/api/`
**Files scanned:** `wallets.py` (router), `wallet.py` (model), `auth.py` (dependency), `supabase.py` (core), `wallets/page.tsx`, `client.ts`, `types.ts`, `main.py`, `001_create_dompet.sql`
**Pattern extraction date:** 2026-07-05
**Note:** Phase 1's `wallets.py`/`wallet.py`/`wallets/page.tsx` triad is the single structural template for essentially all new CRUD surfaces this phase (transactions, goals, goal-settings). The two genuinely novel modules — `saw_engine.py` and `allocation_service.py`/`AllocationSuggestionModal.tsx` — have no in-repo precedent and must be built from RESEARCH.md's concrete (but `[ASSUMED]`-flagged) pseudocode; planner should flag these for the `checkpoint:human-verify` team sign-off RESEARCH.md recommends before Fertika/Hidayat build against them.
