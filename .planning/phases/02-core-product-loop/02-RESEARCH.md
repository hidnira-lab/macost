# Phase 2: Core Product Loop - Research

**Researched:** 2026-07-05
**Domain:** SAW (Simple Additive Weighting) ranking engine, FastAPI + Supabase computed/aggregated fields, suggest-and-confirm allocation UX
**Confidence:** MEDIUM (algorithm mechanics HIGH; several business-formula specifics ASSUMED pending PRD §10.1, which is not present in this repo — see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Transaction quick-entry form**
- **D-01:** `tipe_transaksi` (Pemasukan/Pengeluaran) is derived from the selected category, not a separate required field. Every category already carries `flag_pemasukan` (same field that drives `source_label`); the frontend sends `kategori_id` only and the backend resolves `tipe_transaksi` from it. This keeps the "3 required fields" (nominal, kategori, dompet) intact and stays consistent with the already-locked rule that source/type labeling is server-side, never sent manually by the frontend.
- **D-02:** `tanggal_transaksi` is required by API_CONTRACT.md but does not count against the "3 required fields" budget — it defaults to today's date, pre-filled and visible in the form, editable by the user when the transaction isn't from today.

**Allocation suggestion modal — timing & failure handling**
- **D-03:** Immediately after `POST /api/transactions` succeeds for a side-income transaction, show a loading overlay ("Menghitung saran alokasi...") while `GET /api/transactions/{id}/allocation-suggestion` is in flight, then transition directly into the allocation suggestion modal once the response arrives.
- **D-04:** No hard client-side timeout on the allocation-suggestion request. The overlay stays until the response arrives (the ≤2 second target from ROADMAP.md success criteria is a backend/integration-test target, not something to mask by cutting the frontend wait short). If the request errors out entirely, dismiss the overlay, show a short error toast, and leave the transaction saved — the user can still act on it later via the Pending Allocations page.

**SAW strategy toggle (Quick Win vs Importance-First)**
- **D-05:** Toggling strategy on the Goals page is a real, persisted preference change: it immediately calls `PUT /api/goal-settings` with the new `strategy` value (weights unchanged), then refetches `GET /api/goals` so ranking re-renders under the new strategy. This is not a client-side-only preview.

**Empty states (new user, zero data)**
- **D-06:** When a user has no transactions and/or no goals yet, Dashboard KPIs and the Goals page each show a lightweight, section-scoped empty message paired with one relevant CTA — not a single full-page illustrated empty state.

### Claude's Discretion
- Exact folder/component structure for the transaction form, allocation modal, and empty-state components.
- Precise wording of empty-state messages and toast copy (Bahasa Indonesia, matching existing tone).
- Where exactly the SAW strategy toggle control sits in the Goals page layout (per Figma frame once implemented).
- SAW engine edge-case implementation details (0 goals, 1 goal, identical values) — behavior is already locked by SAW-02; only the code structure is Claude's call.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 2 scope. Receipt scan, e-statement import, AI insights, SAW weight adjustment (SAW-04/05), and Quick Access Panel are correctly scoped to Phase 3/backlog and were not raised as in-scope requests.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRAN-01 | Manual transaction entry, ≤3 required fields | See "Frontend Integration Pattern" + Pitfall: `tipe_transaksi` contract discrepancy |
| TRAN-02 | Auto source labeling from `flag_pemasukan` | Already established pattern (Phase 1); extend to `tipe_transaksi` per D-01; see Pitfall #1 |
| TRAN-03 | Transaction history with filters/pagination | See "Recommended Project Structure", `GET /api/transactions` query param handling — standard FastAPI `Query()` params, no special research needed |
| TRAN-04 | Edit transaction | Standard CRUD, follow `wallets.py` PUT pattern |
| TRAN-05 | Delete transaction | Standard CRUD, follow `wallets.py` DELETE pattern; note wallet `saldo` must be recomputed/adjusted on delete (see Pitfall #9) |
| DASH-01 | 5 KPIs in research-validated order | See "Dashboard Aggregation Pattern" |
| DASH-02 | Period filter (this month/last month/custom) | See "Dashboard Aggregation Pattern" — single date-ranged query, group in Python |
| GOAL-01 | Create goal (skor_keinginan 1-5) | See "Supabase Schema" — `goal` table |
| GOAL-02 | Goal list with derived `nominal_terkumpul`/`progress_pct` | See "Derived Fields: SQL Aggregation vs Python" — recommend Python-side |
| GOAL-03 | Goal detail + allocation history | See "Supabase Schema" — `alokasi` table, filtered by `goal_id` |
| GOAL-04 | Edit goal | Standard CRUD |
| GOAL-05 | Delete goal | Standard CRUD; consider cascade behavior for `alokasi` rows (see Pitfall #10) |
| SAW-01 | 5-criteria weighted ranking (locked weights) | See "SAW Engine — Core Algorithm" |
| SAW-02 | Edge cases: 0/1/identical goals | See "SAW Engine — Edge Case Guards" (concrete pseudocode) |
| SAW-03 | Quick Win vs Importance-First toggle | See "SAW Strategy Toggle Mechanism" — flagged ASSUMED, needs confirmation |
| ALLOC-01 | Suggestion modal ≤2s after side-income save | See "Latency Risk Assessment" |
| ALLOC-02 | 29-40% suggested allocation | See "Allocation Service — Suggested Percentage" — recommend fixed 35% |
| ALLOC-03 | Suggest-and-confirm, never auto-execute | Already a locked architectural constraint; `POST /api/allocations` only fires on explicit user tap |
| ALLOC-04 | Skip → pending | See "Supabase Schema" — needs a `pending`/skip state; see Open Question #1 |
| ALLOC-05 | Pending allocations list | See "Supabase Schema" + Open Question #1 |
</phase_requirements>

## Summary

Phase 2's technical core is the SAW ranking engine and its two consumers: the Goals list (real-time rank) and the Smart Allocation suggestion (top-ranked goal + 29-40% of a side-income transaction). The mechanics of SAW itself — normalize each criterion to [0,1], weight, sum, sort — are standard MCDM (multi-criteria decision making) and well-documented; the edge-case guards required by SAW-02 (0 goals, 1 goal, identical values) are straightforward once the normalization functions are written defensively (never divide by a raw value or a max/min that could be zero).

The harder, genuinely ambiguous part is that three of the five SAW inputs are **not directly stored fields** and have no formula documented anywhere in this repo (PRD §10.1, referenced by API_CONTRACT.md for `skor_kepentingan`, is not checked into this repository): how `skor_kepentingan` is derived from `deadline`, how `saving_capacity` is computed per-goal (it isn't a stored column at all), and — most importantly — how toggling `strategy` produces a different ranking order when SAW-03/D-05 both establish that the underlying **weights stay unchanged** on toggle. This research proposes concrete, implementable formulas for all three, clearly tagged `[ASSUMED]`, so the planner is not blocked, but a `checkpoint:human-verify` or team confirmation is strongly recommended before Fertika builds against these formulas, since the ranking is the single feature the whole product is built around.

Separately, a real contract inconsistency was found: **CONTEXT.md D-01 (2026-07-05) says the frontend never sends `tipe_transaksi`, but the currently-locked `API_CONTRACT.md` §4 (v0.1, 2026-06-27) still shows `tipe_transaksi` in the `POST /api/transactions` request body example.** D-01 is more recent and is this phase's canonical constraint, so the backend Pydantic model should treat `tipe_transaksi` as optional/ignored on write (always re-derived server-side), not required — this needs to be called out explicitly in the plan so Fertika's model doesn't silently diverge from Zarra's form (which per D-01 won't send it).

On infrastructure: Railway's hobby plan does **not** sleep by default (only if the "Serverless" toggle is explicitly enabled), and UptimeRobot keep-alive is already confirmed live from Phase 01.1 — so the ≤2s allocation-modal latency risk is dominated by query design, not host cold-starts. The one real N+1 trap is computing `nominal_terkumpul`/`progress_pct` (SUM of `alokasi`) — this should be done with exactly two batched Supabase queries (goals, then `alokasi` filtered with `.in_()`) summed in Python, not per-goal queries, and **not** by enabling PostgREST's native aggregate functions (`db_aggregates_enabled`), which requires a Supabase project-level `ALTER ROLE` config change that falls under Hidayat's platform-ownership rule in `CLAUDE.md` and would needlessly create a cross-team blocking dependency this phase doesn't need.

**Primary recommendation:** Implement `saw_engine.py` as a pure function (`list[Goal] -> list[Goal with rank]`) with explicit `normalize_benefit`/`normalize_cost` helpers that short-circuit on `n<=1` and on zero-value divisors; compute all derived fields (`nominal_terkumpul`, `progress_pct`, `skor_kepentingan`) in Python from two batched Supabase queries rather than SQL aggregation or per-goal queries; treat the SAW-03 strategy toggle as a documented assumption requiring team sign-off before implementation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transaction entry form (3-field, source auto-label) | Browser/Client (Next.js) | API/Backend (derives `source_label`/`tipe_transaksi`) | UI collects minimal input; business rule (label derivation) must never live client-side per locked constraint |
| Transaction history (filter/edit/delete) | Browser/Client | API/Backend (query params, ownership checks) | Filtering UI is client; data + auth scoping is backend |
| SAW ranking computation | API/Backend (`saw_engine.py`) | Database (source data only) | Pure computation over goal+allocation rows; must be real-time per contract, not pre-materialized |
| Smart Allocation suggestion | API/Backend (`allocation_service.py`) | Browser/Client (modal presentation only) | Percentage + goal selection is server logic; client only renders and captures confirm/skip |
| Allocation confirm/skip execution | API/Backend | Database (persists `alokasi` row, updates goal progress indirectly via SUM) | Never auto-executed; write only happens on explicit `POST /api/allocations` |
| Goal CRUD | API/Backend | Database | Standard CRUD, RLS-scoped like `dompet` |
| Dashboard aggregation (5 KPIs + period filter) | API/Backend | Database | Aggregation must happen server-side; client only renders |
| Pending allocations list | API/Backend | Database | Requires a persisted "skip" state (see Open Question #1) |
| Empty states | Browser/Client | — | Pure UI concern, section-scoped per D-06 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | 0.138.2 (installed; 0.139.0 latest) [VERIFIED: pip index] | REST endpoints for transactions/goals/allocations/dashboard | Already the project's backend framework (Phase 1) |
| pydantic | 2.13.4 [VERIFIED: pip index] | Request/response validation, weight-sum validator | Already in use; FastAPI's native validation layer |
| supabase (supabase-py) | >=2.0.0 pinned, 2.31.0 latest [VERIFIED: pip index] | Postgres access via PostgREST | Already in use for `dompet`; same client for new tables |
| PyJWT | >=2.9.0 [ASSUMED — not re-verified this session, unchanged from Phase 1] | JWT verification (reused, no new work) | Already working end-to-end via JWKS (`backend/dependencies/auth.py`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python stdlib `datetime`/`date` | 3.12 stdlib | Days-until-deadline math for `skor_kepentingan`, date filters for dashboard | No third-party date library needed — this is simple day-count math |
| swr | ^2.4.2 (already in `apps/web/package.json`, unused) | Optional: automatic revalidation for Pending Allocations / Goals list | Currently NOT used anywhere in the codebase (`wallets/page.tsx` uses manual `useState`/`useEffect`); recommend staying consistent with the established manual-fetch pattern for this phase given the tight timeline — swr is available if the team later wants auto-revalidation, but introducing it now is an unforced scope increase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Python-side SUM aggregation | PostgREST native aggregate functions (`db_aggregates_enabled`) | Requires a Supabase project-level `ALTER ROLE authenticator SET pgrst.db_aggregates_enabled='true'` — a dashboard/SQL change that falls under Hidayat's platform-ownership rule (`CLAUDE.md`), creating unnecessary cross-team blocking for a dataset small enough that Python aggregation is trivially fast |
| Fixed 35% allocation suggestion | Dynamic percentage scaled by goal urgency/feasibility | More "intelligent" but unverifiable against any documented formula this session; adds risk for a Phase 2 MVP deadline with no clear spec to build against |
| SWR for data fetching | Manual `useState`/`useEffect`/`useCallback` (current pattern) | SWR gives auto-revalidation/caching for free, but the existing codebase (`wallets/page.tsx`) doesn't use it — switching mid-project adds inconsistency risk under time pressure |

**Installation:** No new packages required — all needed libraries are already declared in `backend/requirements.txt` and `apps/web/package.json`.

**Version verification:** `pip3 index versions fastapi` → 0.139.0 latest (0.138.2 pinned in requirements, no urgent need to bump); `pip3 index versions supabase` → 2.31.0 latest (`>=2.0.0` pin already permits it); `pip3 index versions pydantic` → 2.13.4 latest (matches installed). No frontend package changes needed — `swr` already present but optional for this phase.

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** All required libraries (`fastapi`, `pydantic`, `supabase`, `PyJWT` on the backend; `swr`, `next`, `react` on the frontend) are already installed and verified from Phase 1. No `npm install` / `pip install` of new third-party packages is required to implement TRAN/DASH/GOAL/SAW/ALLOC requirements — this section is included per protocol but the audit table is empty by design.

**Packages removed due to [SLOP] verdict:** none (no new packages evaluated)
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[User: Transaction Form] ──POST /api/transactions──▶ [FastAPI: transactions.py]
                                                            │
                                          derive tipe_transaksi + source_label
                                          from kategori.flag_pemasukan (server-side)
                                                            │
                                                            ▼
                                                  [Supabase: transaksi INSERT]
                                                            │
                                          response: allocation_suggestion_available
                                                            │
                          ┌─────────────────────────────────┴───── (false) ──▶ [refresh transaction list]
                          │ (true — side income)
                          ▼
        [User sees loading overlay "Menghitung saran alokasi..."]
                          │
             GET /api/transactions/{id}/allocation-suggestion
                          │
                          ▼
              [FastAPI: allocations.py → allocation_service.py]
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
     [Supabase: goal SELECT]   [Supabase: alokasi SELECT .in_(goal_ids)]
              │                        │
              └───────────┬────────────┘
                          ▼
              [saw_engine.rank_goals()] — pure Python, in-memory
                          │
              rank #1 goal + 35% of nominal → suggestion
                          │
                          ▼
        [User: Allocation Confirmation Modal] ──confirm──▶ POST /api/allocations
                          │                                        │
                       skip│                                       ▼
                          ▼                            [Supabase: alokasi INSERT]
              POST /api/allocations/{id}/skip                      │
                          │                              goal_updated (recomputed
                          ▼                              nominal_terkumpul/progress_pct)
              [Supabase: pending state]                            │
                          │                                        ▼
                          ▼                          [Goal progress bar updates immediately]
        [GET /api/allocations/pending — Notifikasi page]

[Dashboard page] ──GET /api/dashboard?period=...──▶ [FastAPI: dashboard.py]
                                                            │
                                     single date-ranged query: transaksi + goal
                                                            │
                                            group/sum in Python (5 KPIs)
                                                            │
                                                            ▼
                                          [Dashboard renders in fixed research order]
```

### Recommended Project Structure
```
backend/
├── routers/
│   ├── transactions.py     # POST/GET/PUT/DELETE /api/transactions, scan-receipt & upload-statement stubs deferred to Phase 3
│   ├── goals.py             # POST/GET/PUT/DELETE /api/goals, GET /api/goals/{id}
│   ├── goal_settings.py     # GET/PUT /api/goal-settings
│   ├── allocations.py       # GET .../allocation-suggestion, POST /api/allocations, POST .../skip, GET /api/allocations/pending
│   ├── dashboard.py         # GET /api/dashboard
│   └── categories.py        # GET /api/categories (read-only)
├── models/
│   ├── transaction.py        # TransactionCreate/Update/Response (Pydantic)
│   ├── goal.py                # GoalCreate/Update/Response
│   ├── goal_settings.py      # GoalSettingsUpdate/Response + weight-sum validator
│   ├── allocation.py          # AllocationCreate/Response, PendingAllocation
│   └── category.py            # CategoryResponse
├── services/
│   ├── saw_engine.py          # pure ranking function — see below
│   └── allocation_service.py  # suggested amount/pct + alternative_goals selection
└── migrations/
    ├── 001_create_dompet.sql   # existing
    ├── 002_create_kategori.sql
    ├── 003_create_transaksi.sql
    ├── 004_create_goal.sql
    ├── 005_create_alokasi.sql
    ├── 006_create_goal_settings.sql
    └── 007_seed_kategori.sql   # seed data — see "Category Seed Data" below

apps/web/
├── app/
│   ├── transactions/page.tsx       # history + filter (TRAN-03)
│   ├── goals/
│   │   ├── page.tsx                 # list, ranked (GOAL-02, SAW-01/03)
│   │   ├── [id]/page.tsx            # detail + allocation history (GOAL-03)
│   │   └── new/page.tsx             # create/edit (GOAL-01/04)
│   ├── allocations/pending/page.tsx # Sitemap #17
│   └── dashboard/page.tsx           # DASH-01/02
├── components/
│   ├── TransactionForm.tsx
│   ├── AllocationSuggestionModal.tsx  # Sitemap #16
│   └── EmptyState.tsx                  # section-scoped, per D-06
```

### Pattern 1: Server-derived fields, never client-writable
**What:** `tipe_transaksi`, `source_label`, `skor_kepentingan`, `progress_pct`, `nominal_terkumpul`, `rank` are always computed/derived server-side, regardless of what a request body contains.
**When to use:** Every POST/PUT handler for `transaksi` and `goal`.
**Example:**
```python
# Source: pattern extension of backend/routers/wallets.py (existing, Phase 1)
@router.post("/transactions", status_code=201)
def create_transaction(body: TransactionCreate, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase_admin()
    kategori = (
        supabase.table("kategori").select("*").eq("id_kategori", body.kategori_id).execute()
    ).data[0]

    # tipe_transaksi and source_label are ALWAYS derived — never trust body.tipe_transaksi
    # even if a stale frontend still sends it (see Pitfall #1 / D-01 vs API_CONTRACT.md discrepancy)
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

### Pattern 2: Batched aggregation, never per-row queries
**What:** Compute `nominal_terkumpul`/`progress_pct` for N goals with exactly 2 Supabase queries, not N+1.
**When to use:** `GET /api/goals`, `GET /api/goals/{id}`, and anywhere goal progress is read.
**Example:**
```python
# Source: derived pattern — Supabase Python client `.in_()` filter
# https://supabase.com/docs/reference/python/using-filters
goals = supabase.table("goal").select("*").eq("id_pengguna", uid).execute().data
goal_ids = [g["id_goal"] for g in goals]

alokasi_rows = (
    supabase.table("alokasi").select("goal_id, nominal_alokasi")
    .in_("goal_id", goal_ids)
    .execute().data
    if goal_ids else []
)

sums: dict[str, int] = {}
for row in alokasi_rows:
    sums[row["goal_id"]] = sums.get(row["goal_id"], 0) + row["nominal_alokasi"]

for g in goals:
    g["nominal_terkumpul"] = sums.get(g["id_goal"], 0)
    g["progress_pct"] = round(100 * g["nominal_terkumpul"] / g["nominal_target"]) if g["nominal_target"] else 0
```

### Anti-Patterns to Avoid
- **Enabling PostgREST aggregate functions for this phase:** Requires `ALTER ROLE authenticator SET pgrst.db_aggregates_enabled='true'` at the Supabase project level — a dashboard/SQL change gated behind Hidayat's platform-ownership rule. Avoid; Python-side aggregation is simpler and needs zero external coordination.
- **Storing `skor_kepentingan` as a static column set once at goal creation:** It will silently go stale as the deadline approaches (urgency should increase over time). Compute it fresh on every read/write in application code from `deadline` (see below).
- **Per-goal queries in a loop for allocation history / progress:** N+1 query pattern — always batch via `.in_()`.
- **Trusting `tipe_transaksi` from the request body:** Contradicts D-01; always re-derive server-side from `kategori_id`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom JWT parsing/validation | `backend/dependencies/auth.py` (already built, JWKS-based) | Already solved end-to-end in Phase 1; reuse directly for every new router |
| Per-user data isolation | Manual `if row.user_id != current_user` checks in Python | RLS policies (mirroring `001_create_dompet.sql`) + double `.eq(id, id_pengguna)` in every query, exactly like `wallets.py` | Defense in depth — RLS is the backstop even though the admin client bypasses it; the `.eq()` pattern is the actual enforcement layer given `get_supabase_admin()` is used |
| UUID generation | Custom ID generator | Postgres `gen_random_uuid()` default (as in `dompet`) | Consistency with existing schema convention |
| Weight-sum validation | Manual float `==` comparison | Pydantic `field_validator` with `abs(sum(weights.values()) - 1.0) < 0.001` tolerance | Floating-point equality is unreliable; 0.001 tolerance matches the SAW-04 spec already documented in CLAUDE.md |
| SAW normalization math | Ad-hoc per-criterion if/else scattered across the codebase | Two small reusable functions: `normalize_benefit(values)` / `normalize_cost(values)` (see below) | A single normalization implementation is much easier to unit-test for the 0/1/identical-value edge cases SAW-02 requires |
| Date/day-count math | Manual date-string parsing | Python stdlib `datetime.date` subtraction (`(deadline - today).days`) | Stdlib already handles this correctly; no third-party dependency needed |

**Key insight:** Nearly everything infrastructural for this phase (auth, RLS, ID generation) is already solved in Phase 1's `wallets.py`/`dompet` pair — the only genuinely new code is the SAW engine and the allocation suggestion logic, which is why this research concentrates there.

## SAW Engine — Core Algorithm

**Confidence: HIGH for the general SAW mechanics** [CITED: general MCDM literature — Simple Additive Weighting is a standard weighted-sum multi-criteria method; normalization formulas cross-verified across multiple academic sources]. **Confidence: LOW/ASSUMED for the three Macost-specific formulas** (`skor_kepentingan`, `saving_capacity`, strategy-toggle mechanism) — see Assumptions Log.

### The 5 criteria, their type (benefit/cost), and proposed derivation

| Criterion | Weight | Type | Raw value | Source |
|-----------|--------|------|-----------|--------|
| `personal_importance` | 22.5% | Benefit | `skor_keinginan` (1-5, direct user input) | Stored column — [VERIFIED: API_CONTRACT.md §5] |
| `progress_gap` | 21.9% | Cost | `(nominal_target - nominal_terkumpul) / nominal_target` (0 = done, 1 = nothing saved) | Derived from `nominal_terkumpul` (SUM of `alokasi`) |
| `saving_capacity` | 21.5% | Benefit | `min(1, (months_remaining × avg_monthly_side_income) / nominal_sisa)` — feasibility ratio: can the user realistically fund this goal by its deadline at their current pace? | **[ASSUMED]** — no stored column, no PRD formula available; see Assumptions Log A2 |
| `urgency` | 17.8% | Benefit | `skor_kepentingan` (1-5, auto-derived from `deadline`) | **[ASSUMED]** formula below; see Assumptions Log A1 |
| `target_amount` | 16.2% | Cost | `nominal_target` (smaller goals score higher — "easier win") | Stored column, direction is a design choice — see Assumptions Log A3 |

### Normalization (with edge-case guards)

```python
# backend/services/saw_engine.py

def normalize_benefit(values: list[float]) -> list[float]:
    """Higher raw value = better. Classic SAW: x_ij / max(x_j)."""
    m = max(values)
    if m == 0:
        return [1.0 for _ in values]  # guard: all-zero criterion, treat as tied-best
    return [v / m for v in values]

def normalize_cost(values: list[float]) -> list[float]:
    """Lower raw value = better. Classic SAW: min(x_j) / x_ij."""
    m = min(values)
    return [1.0 if v == 0 else m / v for v in values]  # guard: v==0 would divide-by-zero
```

### SAW-02 edge case guards (mandatory)

```python
def rank_goals(goals: list[dict], weights: dict, strategy: str = "quick_win") -> list[dict]:
    n = len(goals)
    if n == 0:
        return []                       # SAW-02: 0 goals → empty array, no crash
    if n == 1:
        g = dict(goals[0]); g["rank"] = 1
        return [g]                      # SAW-02: 1 goal → rank=1, skip normalization entirely

    # ... compute raw criterion values, normalize (identical values across goals
    # normalize to the same score for every criterion — e.g. all skor_keinginan=3
    # -> normalize_benefit gives [1.0, 1.0, ...] for all of them, which is a valid,
    # non-crashing tie, not a division error) ...

    # Tie-break: sort by weighted score, then by created_at ascending (older
    # goal wins ties) for a deterministic, explainable order.
```

**Identical-value tie-break rationale:** When all goals have identical criteria values, every `normalize_benefit`/`normalize_cost` call above produces the same normalized value across the set (e.g. `max(values)==values[i]` for every `i`), so the weighted sum is genuinely tied — this is mathematically correct, not a bug. The requirement is a *stable, deterministic* sort, not a "correct" tie-break — `created_at ASC` (oldest goal first) is recommended because it's simple, explainable in a demo ("ties go to whichever goal you made first"), and requires no extra input from the user.

## SAW Strategy Toggle Mechanism — [ASSUMED, needs confirmation]

**The problem:** SAW-03 requires the ranking order to visibly change when the user toggles Quick Win ↔ Importance-First. D-05 (locked) states the weights are **unchanged** when this toggle fires — only the `strategy` field is sent to `PUT /api/goal-settings`. Since the same 5 weights applied to the same criteria values will always produce the same weighted score, **the toggle cannot work by changing weights alone** — something else about the computation must differ per strategy. No PRD section documents this mechanism, so it must be designed.

**Recommended mechanism (concrete, implementable, defensible):**
1. Compute the base weighted SAW score identically for both strategies (the formula above).
2. Sort key differs by strategy:
   - `quick_win` (default): primary sort key = `progress_gap` ascending (smallest remaining-fraction goals — i.e., nearly finished — bubble to the top), secondary key = weighted score descending. This directly matches the plain-language spec: *"prioritaskan goal hampir selesai."*
   - `importance_first`: sort purely by weighted score descending (no override) — lets `personal_importance` (22.5%) and `urgency` (17.8%), which are already the two largest non-progress weights, compete on equal footing with the other criteria.
3. Both strategies use `created_at ASC` as the final tie-break.

This produces a genuinely different, deterministic order on toggle using the *same* weights and the *same* criteria values — satisfying D-05 literally — while staying simple enough to explain in a viva/demo. **This is a design proposal, not a verified requirement** — flag for team confirmation (Assumptions Log A4) before Fertika builds against it, since it is the single most product-defining piece of logic in the phase.

## `skor_kepentingan` Derivation — [ASSUMED, needs confirmation]

API_CONTRACT.md states `skor_kepentingan dihitung otomatis dari deadline, lihat PRD §10.1` — PRD §10.1 is not present in this repository (`docs/`, `context/` were checked; only `Macost_Sitemap_Pages.md` and `PANDUAN_TEKNIKAL_TIM.md` exist). Proposed bucketed formula, scaled to match `skor_keinginan`'s existing 1-5 range:

```python
from datetime import date

def compute_skor_kepentingan(deadline: date, today: date | None = None) -> int:
    today = today or date.today()
    days_remaining = (deadline - today).days
    if days_remaining <= 30:
        return 5   # also covers overdue (negative days_remaining) -> max urgency
    elif days_remaining <= 90:
        return 4
    elif days_remaining <= 180:
        return 3
    elif days_remaining <= 365:
        return 2
    else:
        return 1
```

**Recommendation:** Do not persist this as a static DB column — compute it in the router layer on every `GET`/`POST` response so it never goes stale as the deadline approaches (see Anti-Patterns above). Flag this bucket scheme for team sign-off (Assumptions Log A1) — the specific day thresholds (30/90/180/365) are a reasonable default, not a verified spec.

## Derived Fields: SQL Aggregation vs Python-Side — Recommendation

**Recommendation: Python-side aggregation**, for three concrete reasons found this session:
1. PostgREST's native `SUM()`/aggregate support requires `db_aggregates_enabled` to be turned on at the Postgres role level (`ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true'; NOTIFY pgrst, 'reload config';`) [CITED: supabase.com/blog/postgrest-aggregate-functions] — this is a Supabase-dashboard/SQL-level change, which per `CLAUDE.md`'s platform-ownership rule must be scoped as a separate Hidayat-only task and would needlessly block Fertika's backend work this phase.
2. Data scale is a single student's transactions/goals — tens to low hundreds of rows per the phase description — so Python-side `sum()` over an already-fetched list is sub-millisecond; there is no performance case for pushing this into SQL.
3. It keeps the pattern consistent with the existing `wallets.py` style (simple `.select()`/`.eq()` calls, no custom SQL functions or views), which is easier for 4 developers with limited FastAPI/Supabase experience to maintain under a tight deadline.

**Implementation:** exactly 2 Supabase queries total for a goals list (goals + `alokasi.in_(goal_ids)`), never N+1 — see Pattern 2 above.

## Supabase Schema Recommendation

Following the `001_create_dompet.sql` convention (UUID PK via `gen_random_uuid()`, `id_pengguna` FK to `auth.users`, RLS with 4 policies mirroring `dompet_select_own`/`insert_own`/`update_own`/`delete_own`):

```sql
-- 002_create_kategori.sql — READ-ONLY, seeded, shared across all users (no id_pengguna)
CREATE TABLE IF NOT EXISTS public.kategori (
    id_kategori     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori   TEXT NOT NULL,
    tipe            TEXT NOT NULL CHECK (tipe IN ('Pemasukan', 'Pengeluaran')),
    flag_pemasukan  TEXT,
    flag_pengeluaran TEXT
);
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kategori_select_all" ON public.kategori FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policy for regular users — read-only for MVP (service role bypasses for seeding)

-- 003_create_transaksi.sql
CREATE TABLE IF NOT EXISTS public.transaksi (
    id_transaksi      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipe_transaksi    TEXT NOT NULL CHECK (tipe_transaksi IN ('Pemasukan', 'Pengeluaran')),
    nominal           INTEGER NOT NULL CHECK (nominal > 0),
    tanggal_transaksi DATE NOT NULL,
    metode_input      TEXT NOT NULL DEFAULT 'Manual',
    dompet_id         UUID NOT NULL REFERENCES public.dompet(id_dompet) ON DELETE CASCADE,
    kategori_id       UUID NOT NULL REFERENCES public.kategori(id_kategori),
    source_label      TEXT,  -- denormalized snapshot at write-time; server-derived, never client-writable
    catatan           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: 4 policies identical in shape to dompet_select_own/insert_own/update_own/delete_own, scoped on id_pengguna

-- 004_create_goal.sql
CREATE TABLE IF NOT EXISTS public.goal (
    id_goal         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_goal       TEXT NOT NULL,
    nominal_target  INTEGER NOT NULL CHECK (nominal_target > 0),
    deadline        DATE NOT NULL,
    skor_keinginan  INTEGER NOT NULL CHECK (skor_keinginan BETWEEN 1 AND 5),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NOTE: skor_kepentingan, nominal_terkumpul, progress_pct, rank are NOT
    -- stored columns — always computed in application code (see recommendations above)
);
-- RLS: same 4-policy pattern

-- 005_create_alokasi.sql
CREATE TABLE IF NOT EXISTS public.alokasi (
    id_alokasi      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pengguna     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- denormalized for simple RLS, matches dompet convention
    goal_id         UUID NOT NULL REFERENCES public.goal(id_goal) ON DELETE CASCADE,
    transaksi_id    UUID NOT NULL REFERENCES public.transaksi(id_transaksi) ON DELETE CASCADE,
    nominal_alokasi INTEGER NOT NULL CHECK (nominal_alokasi > 0),
    tanggal_alokasi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: same 4-policy pattern on id_pengguna

-- 006_create_goal_settings.sql — one row per user, get-or-create-default on first GET
CREATE TABLE IF NOT EXISTS public.goal_settings (
    id_pengguna UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy    TEXT NOT NULL DEFAULT 'quick_win' CHECK (strategy IN ('quick_win', 'importance_first')),
    weights     JSONB NOT NULL DEFAULT '{"personal_importance":0.225,"progress_gap":0.219,"saving_capacity":0.215,"urgency":0.178,"target_amount":0.162}'::jsonb
);
-- RLS: select_own/update_own only (no delete needed; insert happens via get-or-create in application code)
```

**Pending/skip state (Open Question #1):** the schema above has no explicit "pending suggestion" table. `POST /api/allocations/{transaction_id}/skip` returns `pending_until`, and `GET /api/allocations/pending` must list unresolved skips. Recommend either (a) a lightweight `skipped_suggestion` table (`transaksi_id`, `skipped_at`, `expires_at`), or (b) deriving "pending" implicitly as "side-income transaction with no matching `alokasi` row and no explicit dismissal," which avoids a new table but needs an explicit `dismissed` flag somewhere to distinguish "not yet decided" from "user explicitly skipped." This needs a planner decision — flagged in Open Questions.

### Category Seed Data — needs creation this phase

`kategori` has zero seed rows today. `Macost_Riset_Tambahan_Variabel.md` (referenced in `CLAUDE.md` as the source taxonomy) is **not present in this repository** — checked `docs/`, `context/`, and repo root. However, the existing mock fixtures (`apps/web/mocks/dashboard.json`, `transactions.json`) already encode a partial taxonomy the team designed to mirror real categories [VERIFIED: repo files] — `Makan & Minum`, `Transportasi`, `Hiburan`, `Keperluan Kuliah`, `Tempat Tinggal` (expense) and `source_label` values `"Fixed Routine"` / `"Flexible Side Income"` (income). A minimal seed set derived from these fixtures is proposed in the migration, but the exact `flag_pengeluaran` sub-labels (`Kebutuhan`/`Keinginan`) and any missing categories are **[ASSUMED]** — recommend a `checkpoint:human-verify` task so Fertika or Hidayat confirms the full list against the actual survey doc before the demo.

## Frontend Integration Pattern (Allocation Flow)

Given no state-management library is installed beyond an unused `swr`, and the established precedent in `apps/web/app/wallets/page.tsx` uses plain `useState`/`useEffect`/`useCallback`, recommend the same pattern — sequential `await`, no `Promise.race`/timeout (per D-04):

```tsx
// Source: pattern extension of apps/web/app/wallets/page.tsx (existing, Phase 1)
async function handleSaveTransaction(formData: TransactionCreateRequest) {
  setSaving(true);
  try {
    const created = await apiMutate<Transaction>('/api/transactions', 'POST', formData);
    await refreshTransactionList();

    if (created.allocation_suggestion_available) {
      setShowAllocationOverlay(true); // "Menghitung saran alokasi..."
      try {
        const suggestion = await apiFetch<AllocationSuggestionResponse>(
          `/api/transactions/${created.id_transaksi}/allocation-suggestion`
        );
        setShowAllocationOverlay(false);
        if (suggestion.has_active_goal) {
          openAllocationModal(suggestion);       // Sitemap #16
        } else {
          openCreateGoalPrompt();                 // "Buat goal dulu"
        }
      } catch {
        setShowAllocationOverlay(false);
        showToast('Gagal memuat saran alokasi. Cek nanti di halaman Pending.'); // D-04
      }
    }
  } finally {
    setSaving(false);
  }
}
```

Note: no client-side `setTimeout`/`AbortController` timeout is used here, per D-04 — the overlay stays until the fetch settles (success or error), matching the locked decision exactly.

## Latency Risk Assessment (≤2s allocation suggestion)

- **Railway hobby plan does not sleep by default** — only when the "Serverless" toggle is explicitly enabled on the service [CITED: docs.railway.com/reference/app-sleeping]. Phase 01.1 already confirmed UptimeRobot keep-alive is live and monitoring `/health` at a 5-minute interval, which independently prevents any sleep state regardless of the Serverless setting. **Action item:** explicitly verify the Railway service's Serverless toggle is OFF before the Phase 2 integration/demo session — a single accidental toggle would reintroduce a 502/cold-start risk on the exact request path (allocation suggestion) this phase's success criteria depend on.
- **SAW computation itself is O(n) for n goals in the tens range** — negligible (sub-millisecond in Python).
- **The real latency budget is 2 sequential HTTP round-trips** (`POST /api/transactions` then `GET .../allocation-suggestion`) each making 1-2 Supabase REST calls. As long as the N+1 trap above is avoided (batch `alokasi` fetch via `.in_()`, not per-goal), this should comfortably fit within 2 seconds even accounting for Railway↔Supabase network hops.
- **Recommend an explicit integration-test task** (already flagged in ROADMAP.md as Hidayat's ownership) measuring real latency against the live Railway+Supabase stack, not localhost — this is the only way to actually verify the ≤2s target since local dev latency is not representative.

## Common Pitfalls

### Pitfall 1: `tipe_transaksi` contract discrepancy (D-01 vs API_CONTRACT.md)
**What goes wrong:** `API_CONTRACT.md` §4's literal `POST /api/transactions` request example still shows `tipe_transaksi` as a sent field, but CONTEXT.md D-01 (more recent, 2026-07-05) locks that the frontend sends `kategori_id` only and the backend derives `tipe_transaksi`.
**Why it happens:** D-01 was decided after API_CONTRACT.md v0.1 was written and API_CONTRACT.md hasn't been updated to match.
**How to avoid:** Make `tipe_transaksi` an **optional, ignored** field in the backend Pydantic `TransactionCreate` model (accept it if present for backward compatibility, but always overwrite with the server-derived value); do not make it a required field. Flag this drift to the team so API_CONTRACT.md gets a follow-up revision note (per its own "living document" clause).
**Warning signs:** A `422 Unprocessable Entity` on transaction save if the model marks `tipe_transaksi` as required and Zarra's form (correctly following D-01) omits it.

### Pitfall 2: SAW division-by-zero on 0/1/identical goals
**What goes wrong:** Naive `value / max(values)` or `min(values) / value` crashes or returns `nan`/`inf` when there's 1 goal (max==the only value is fine, but a careless "compare across N-1 others" style implementation breaks) or when a cost criterion's raw value is exactly 0.
**Why it happens:** Classic SAW formulas assume ≥2 alternatives with non-zero comparison bases; new-user empty states (0-1 goals) are the norm at demo time, not the exception.
**How to avoid:** Explicit `n==0`/`n==1` short-circuits before any normalization runs at all (see pseudocode above); guard every cost-normalization divide with `if v == 0: return 1.0`.
**Warning signs:** `GET /api/goals` returning HTTP 500 for a freshly-registered demo account — this is explicitly called out as a top risk in ROADMAP.md.

### Pitfall 3: IDOR on new tables (transaksi/goal/alokasi)
**What goes wrong:** Forgetting the double `.eq("id", ...).eq("id_pengguna", current_user_id)` pattern that `wallets.py` already establishes, allowing one user to read/edit/delete another user's transaction, goal, or allocation by guessing/enumerating a UUID.
**Why it happens:** `get_supabase_admin()` bypasses RLS (service-role key) — RLS is a backstop, not the actual enforcement layer, since the backend always uses the admin client.
**How to avoid:** Every new router handler for `transaksi`/`goal`/`alokasi` must replicate the exact `wallets.py` pattern: filter every read/update/delete by both the row ID and `id_pengguna`.
**Warning signs:** Code review finds a `.eq("id_X", x)` without an accompanying `.eq("id_pengguna", current_user_id)`.

### Pitfall 4: N+1 queries for aggregation
**What goes wrong:** Fetching `alokasi` rows one goal at a time in a loop to compute `nominal_terkumpul`.
**Why it happens:** It's the "obvious" way to write it if you start from a per-goal mental model.
**How to avoid:** Always batch via `.in_("goal_id", goal_ids)` and sum in Python (Pattern 2 above).
**Warning signs:** Goals-list response time scaling linearly with goal count during manual testing.

### Pitfall 5: Enabling PostgREST aggregates instead of Python-side sum
**What goes wrong:** Reaching for `SELECT SUM(nominal_alokasi)` via PostgREST's aggregate feature, discovering it's disabled by default, and then needing a Supabase dashboard/SQL change to enable it.
**Why it happens:** It feels like the "proper SQL" way to do a sum.
**How to avoid:** Given the tiny data scale (tens of rows per user) and the platform-ownership constraint (any Supabase project-level config change needs Hidayat, per `CLAUDE.md`), do the sum in Python instead — see "Derived Fields" recommendation above.
**Warning signs:** A migration or task description that requires "ask Hidayat to run an ALTER ROLE" — that's the tell this should have been done in Python instead.

### Pitfall 6: Stale `skor_kepentingan` if persisted
**What goes wrong:** Storing the deadline-derived urgency score once at goal creation means it never increases as the deadline approaches, silently breaking the SAW ranking's urgency signal over the goal's lifetime.
**How to avoid:** Compute `skor_kepentingan` in application code on every read (and on write, for the API response), never persist it as the source of truth.
**Warning signs:** A goal created with a distant deadline still ranks low even after the deadline has become imminent.

### Pitfall 7: Floating-point weight-sum validation
**What goes wrong:** `sum(weights.values()) == 1.0` fails due to float representation even when the user's input is logically "100%" (e.g., 0.225+0.219+0.215+0.178+0.162 may not equal exactly 1.0 in binary floating point).
**How to avoid:** Use `abs(sum(weights.values()) - 1.0) < 0.001` (the same tolerance already documented for SAW-04 in CLAUDE.md), even though weight *adjustment* is Phase 3 — the `PUT /api/goal-settings` validator exists and is exercised this phase via D-05's strategy toggle (which re-sends the same weights).
**Warning signs:** Intermittent `400 VALIDATION_ERROR` on a `PUT /api/goal-settings` call that sends back the exact default weights unchanged.

### Pitfall 8: Timezone drift in date math
**What goes wrong:** Computing "today" for `skor_kepentingan`/dashboard period filters using local server time inconsistently, causing off-by-one-day boundary bugs (e.g., a goal due "today" flips urgency bucket depending on server timezone vs user's expectation).
**How to avoid:** Use `datetime.now(timezone.utc).date()` explicitly in Python rather than a bare `date.today()` (which uses the OS/local timezone) — Railway containers typically run UTC, but being explicit removes the ambiguity.
**Warning signs:** A goal due "tomorrow" in the user's local time already shows as "today" or vice versa in urgency calculations.

### Pitfall 9: Wallet balance (`saldo`) not recomputed on transaction edit/delete
**What goes wrong:** TRAN-04/05 (edit/delete transaction) can silently desync `dompet.saldo` if the wallet balance was ever incremented/decremented at transaction-write-time and the edit/delete path forgets to reverse/reapply that adjustment.
**Why it happens:** Not explicitly specified in API_CONTRACT.md whether `saldo` is a stored running balance or a derived SUM (similar ambiguity to `nominal_terkumpul`).
**How to avoid:** Recommend treating `dompet.saldo` the same way as goal progress — compute it as a SUM of that wallet's transactions (Pemasukan minus Pengeluaran) rather than an incrementally-mutated column, for the same staleness-avoidance reason. This is a **new observation this session** — Phase 1's `wallets.py` currently defines `saldo` as a plain stored `INTEGER DEFAULT 0` column with no transaction linkage yet (there was no `transaksi` table in Phase 1). Flag for the planner: decide whether `saldo` becomes derived (SUM) once transactions exist, or stays a manually-adjusted column with explicit increment/decrement logic in the transaction CRUD handlers.
**Warning signs:** Dashboard `total_balance` disagreeing with the sum of individual wallet balances shown on the Wallets page.

### Pitfall 10: Cascading deletes on goal deletion
**What goes wrong:** Deleting a goal that has existing `alokasi` history — the schema above uses `ON DELETE CASCADE` on `alokasi.goal_id`, which silently destroys allocation history (and by extension, money that was already moved out of a wallet conceptually).
**How to avoid:** Confirm with the team whether goal deletion should be blocked if `alokasi` rows exist (safer, prevents accidental data loss) versus cascading (simpler, matches GOAL-05's plain "user dapat menghapus goal" wording). Recommend blocking with a clear error message ("Goal ini punya riwayat alokasi, tidak bisa dihapus") as the safer MVP default, flagged as Claude's discretion per CONTEXT.md.

## Code Examples

### Full-flow allocation service sketch
```python
# backend/services/allocation_service.py — Source: derived from API_CONTRACT.md §7 + saw_engine.py above
def get_allocation_suggestion(transaction: dict, current_user_id: str) -> dict:
    goals = fetch_and_rank_goals(current_user_id)  # uses saw_engine.rank_goals()
    if not goals:
        return {"has_active_goal": False}

    top_goal = goals[0]  # rank == 1
    suggested_pct = 35  # fixed default within the 29-40% range — see Assumptions Log A5
    suggested_amount = round(transaction["nominal"] * suggested_pct / 100)

    return {
        "has_active_goal": True,
        "suggested_goal_id": top_goal["id_goal"],
        "suggested_goal_name": top_goal["nama_goal"],
        "suggested_amount": suggested_amount,
        "suggested_pct": suggested_pct,
        "alternative_goals": [
            {"goal_id": g["id_goal"], "goal_name": g["nama_goal"], "rank": g["rank"]}
            for g in goals[1:3]  # next 2 ranked goals
        ],
    }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| PostgREST required a Postgres view or RPC function for any SUM/aggregate query | PostgREST v12+ supports native aggregate functions directly in REST queries, but they must be explicitly enabled per-project | PostgREST v12 (2024) [CITED: supabase.com/blog/postgrest-aggregate-functions] | Not relevant to adopt this phase (see "Derived Fields" recommendation) — noted so the planner doesn't assume it's on by default |

**Deprecated/outdated:** None directly applicable — this is greenfield work on a current stack (FastAPI 0.138, Pydantic 2.13, Supabase-py 2.x).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `skor_kepentingan` bucket thresholds (≤30/90/180/365 days → 5/4/3/2/1) | `skor_kepentingan` Derivation | Low-medium — affects urgency criterion's relative ordering; easy to retune later since it's computed, not persisted |
| A2 | `saving_capacity` formula (feasibility ratio: projected achievable savings vs. amount still needed) | SAW Engine — criteria table | Medium — this criterion currently has **no stored data source at all**; if the team intends something different (e.g., a manual per-goal input, or based on a different metric), the whole criterion needs rework, not just retuning |
| A3 | `target_amount` treated as a cost criterion (smaller goal = higher priority) | SAW Engine — criteria table | Medium — if the intended semantics are the opposite (bigger financial commitments deserve more attention), ranking order for this criterion inverts |
| A4 | Strategy toggle mechanism: Quick Win = sort override by `progress_gap` ascending; Importance-First = pure weighted-score sort | SAW Strategy Toggle Mechanism | **High** — this is the literal SAW-03 acceptance criterion ("ranking order visibly changes on toggle"); if this mechanism is wrong, the demo's core toggle behavior won't match user/grader expectations |
| A5 | Fixed 35% allocation suggestion (matches existing `apps/web/mocks/allocation-suggestion.json`: 175000/500000 = 35%) | Allocation Service | Low — trivially satisfies the documented 29-40% range; only a risk if graders expect a formula that visibly varies per transaction |
| A6 | Category seed list (5 expense + income categories derived from mock fixtures, not the actual n=62 survey taxonomy) | Category Seed Data | Medium — demo-visible if category names look inconsistent with the rest of the UI/Figma designs; recommend team confirmation before finalizing seed migration |
| A7 | `dompet.saldo` should become a derived SUM once `transaksi` exists (currently a stored column with no transaction linkage) | Pitfall 9 | Medium — if left as a manually-incremented column instead, every transaction CRUD path (create/edit/delete) must remember to adjust it correctly, which is a common source of balance-drift bugs |
| A8 | Goal deletion blocked (not cascaded) when allocation history exists | Pitfall 10 | Low — mostly a UX/data-safety choice; either direction is defensible, but must be a deliberate decision, not an accidental default from `ON DELETE CASCADE` |

**If this table is empty:** N/A — see entries above. All Macost-specific business formulas in this research (as opposed to generic SAW/FastAPI/Supabase mechanics) are assumptions requiring confirmation before Fertika builds the SAW engine and allocation service.

## Open Questions

1. **How is a "pending" allocation suggestion actually represented in storage?**
   - What we know: `POST /api/allocations/{transaction_id}/skip` returns `pending_until`; `GET /api/allocations/pending` must list unresolved skips (Sitemap #17, "accessible 24 jam").
   - What's unclear: whether "pending" needs its own table (explicit skip event) or can be derived implicitly (side-income transaction with no matching `alokasi` row yet, minus some way to distinguish "not yet decided" from "user explicitly skipped and it should stop nagging them").
   - Recommendation: add a lightweight `skipped_suggestion` table (`transaksi_id`, `skipped_at`, `expires_at`) — explicit state is simpler to reason about and query than inferring intent from absence of a row, and matches the 24-hour expiry language in the Sitemap doc.

2. **Does `dompet.saldo` need transaction-linkage work this phase, or is it out of scope until later?**
   - What we know: Phase 1 shipped `saldo` as a plain stored column with manual CRUD (create=0, edit=rename only, no balance mutation observed in `wallets.py`). This phase introduces the first thing (`transaksi`) that should actually move that balance.
   - What's unclear: whether Success Criterion 1 ("wallet balance updates" per Zarra's team-ownership note in ROADMAP.md) implies `saldo` must become a derived SUM this phase, or whether a simpler increment/decrement is acceptable for the MVP deadline.
   - Recommendation: treat as in-scope for this phase (Zarra's ownership note literally lists "wallet balance updates after transaction" as a Phase 2 deliverable) — use the derived-SUM approach for consistency with the goal-progress pattern, avoiding a second class of staleness bug.

3. **Should `GET /api/transactions/{id}/allocation-suggestion` validate that the transaction is actually a side-income transaction before computing a suggestion?**
   - What we know: The frontend only calls this endpoint when `allocation_suggestion_available: true` was returned at creation time.
   - What's unclear: whether the backend should independently re-validate (defense against a stale/buggy frontend calling it for an expense transaction) or trust the caller.
   - Recommendation: add a cheap server-side guard (fetch the transaction, check `tipe_transaksi == "Pemasukan" and source_label == "Flexible Side Income"`, else `404` or a clear `VALIDATION_ERROR`) — low cost, prevents a confusing suggestion appearing against an expense transaction.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (live) | All new tables/RLS | ✓ | Provisioned 2026-07-04 (Phase 01.1) | — |
| Railway backend (live) | All new endpoints | ✓ | `https://macost-production.up.railway.app`, UptimeRobot keep-alive confirmed | — |
| Python | Backend dev | ✓ | 3.14.2 local (project targets 3.12 per `.claude/CLAUDE.md`) | Backend `venv/` should be built with 3.12 as documented; local interpreter mismatch is a dev-machine detail, not a blocker |
| Node.js | Frontend dev | ✓ | v25.2.1 local (`>=20` required) | — |
| npm | Frontend dev | ✓ | 11.6.2 | — |
| pytest / test framework | Nyquist validation (SAW engine unit tests) | ✗ | — | Not yet installed in either `backend/` or `apps/web/` — see Validation Architecture Wave 0 Gaps below |

**Missing dependencies with no fallback:** none blocking implementation.
**Missing dependencies with fallback:** test framework absence is addressed in Wave 0 below (install as part of this phase, given SAW-02's edge cases are exactly the kind of logic that benefits most from unit tests).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed yet — recommend `pytest` + `httpx` (for FastAPI `TestClient`) on the backend |
| Config file | none — see Wave 0 |
| Quick run command | `cd backend && pytest tests/test_saw_engine.py -x` (after Wave 0 setup) |
| Full suite command | `cd backend && pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAW-02 | 0 goals → empty list, no crash | unit | `pytest tests/test_saw_engine.py::test_zero_goals -x` | ❌ Wave 0 |
| SAW-02 | 1 goal → rank=1, no normalization | unit | `pytest tests/test_saw_engine.py::test_single_goal -x` | ❌ Wave 0 |
| SAW-02 | Identical criteria values → stable tie-break, no crash | unit | `pytest tests/test_saw_engine.py::test_identical_values_tiebreak -x` | ❌ Wave 0 |
| SAW-01 | 5-criteria weighted ranking produces expected order for a known fixture | unit | `pytest tests/test_saw_engine.py::test_known_ranking_order -x` | ❌ Wave 0 |
| SAW-03 | Strategy toggle produces a different order for the same weights | unit | `pytest tests/test_saw_engine.py::test_strategy_toggle_changes_order -x` | ❌ Wave 0 |
| ALLOC-02 | Suggested amount is 29-40% of transaction nominal | unit | `pytest tests/test_allocation_service.py::test_suggested_pct_in_range -x` | ❌ Wave 0 |
| TRAN-02 | POST with side-income category → `source_label` set, `tipe_transaksi` correct regardless of body content | integration (FastAPI TestClient + mocked Supabase or a test schema) | `pytest tests/test_transactions.py::test_source_label_derivation -x` | ❌ Wave 0 |
| GOAL-02 | `nominal_terkumpul`/`progress_pct` match SUM of `alokasi` fixtures | unit | `pytest tests/test_goals.py::test_progress_computation -x` | ❌ Wave 0 |
| DASH-01/02 | Dashboard KPI order matches fixed sequence; period filter changes result set | integration | `pytest tests/test_dashboard.py::test_kpi_order_and_period_filter -x` | ❌ Wave 0 |
| TRAN-01, GOAL-01/03/04/05, ALLOC-01/03/04/05 | CRUD/UX flows | manual UAT (Figma-driven UI, not easily unit-testable) | conversational UAT via `/gsd-verify-work` | n/a — manual by design |

### Sampling Rate
- **Per task commit:** run the relevant `pytest tests/test_X.py -x` for whatever module the task touched.
- **Per wave merge:** `cd backend && pytest` (full suite).
- **Phase gate:** Full suite green before `/gsd-verify-work`; SAW engine tests are the highest-value automated coverage given SAW-02 is an explicit, crash-prone requirement.

### Wave 0 Gaps
- [ ] `backend/requirements-dev.txt` (or add to `requirements.txt`) — `pytest`, `httpx` — no test framework installed yet
- [ ] `backend/tests/conftest.py` — shared fixtures (sample goals list, sample weights, a way to stub/fake the Supabase client for unit tests that shouldn't hit the live DB)
- [ ] `backend/tests/test_saw_engine.py` — the SAW-02 edge-case tests are the single most important automated check this phase produces
- [ ] Frontend: no test framework recommended to be added this phase given the timeline — rely on manual conversational UAT for UI flows, consistent with the "Claude's Discretion" scope in CONTEXT.md not covering test infra

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes (reused, no new work) | Existing JWKS-based `get_current_user_id` dependency (`backend/dependencies/auth.py`) |
| V3 Session Management | no | No new session logic this phase |
| V4 Access Control | yes | Double `.eq(id, id_pengguna)` on every new table's query (Pitfall 3) + RLS as backstop |
| V5 Input Validation | yes | Pydantic models: `nominal > 0`, `nominal_target > 0`, `skor_keinginan` 1-5, `deadline` must be a future date (per Sitemap #14 "deadline harus di masa depan" — add this as an explicit validator, it's UI-documented but not yet in any Pydantic model), weight-sum tolerance validator |
| V6 Cryptography | no | No new crypto surface — JWT verification unchanged from Phase 1 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR (Insecure Direct Object Reference) — enumerate another user's `id_transaksi`/`id_goal`/`id_alokasi` | Tampering / Information Disclosure | Double `.eq()` scoping on every query (Pitfall 3), RLS policies as defense-in-depth |
| Mass assignment / over-posting — client sends `rank`, `progress_pct`, `nominal_terkumpul`, `tipe_transaksi`, `skor_kepentingan` trying to override server-computed values | Tampering | Pydantic request models must never include these fields at all (not just "ignore them") — define separate Create/Update request schemas that structurally cannot carry them, rather than accepting-and-overwriting |
| Weight-sum manipulation via `PUT /api/goal-settings` (e.g., sending weights that don't sum to 1.0 to bias ranking) | Tampering | Server-side validator with 0.001 tolerance, reject with `400 VALIDATION_ERROR` otherwise (already documented business rule) |
| Negative/zero `nominal`/`nominal_target` causing division-by-zero downstream in `progress_pct`/SAW normalization | Tampering (leading to Denial of Service via 500s) | Pydantic `gt=0` constraints at the API boundary, not just DB `CHECK` constraints — fail fast with a clean `422`/`400` rather than a raw exception |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/routers/wallets.py`, `backend/models/wallet.py`, `backend/dependencies/auth.py`, `backend/migrations/001_create_dompet.sql`, `apps/web/lib/api/client.ts`, `apps/web/lib/api/types.ts`, `apps/web/app/wallets/page.tsx` — [VERIFIED: direct file read] established patterns this phase extends
- `API_CONTRACT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/phases/02-core-product-loop/02-CONTEXT.md` — [VERIFIED: direct file read] locked contract and decisions

### Secondary (MEDIUM confidence)
- [Railway: Serverless / App Sleeping docs](https://docs.railway.com/reference/app-sleeping) — hobby plan sleep behavior [CITED]
- [Supabase blog: PostgREST Aggregate Functions](https://supabase.com/blog/postgrest-aggregate-functions) — aggregate functions require explicit enabling [CITED]
- [Supabase Python docs: using filters](https://supabase.com/docs/reference/python/using-filters) — `.in_()` filter syntax [CITED]
- General SAW/MCDM mechanics cross-verified across multiple academic sources (MATEC conferences, ResearchGate, IOP Science) — [CITED: general MCDM literature]

### Tertiary (LOW confidence — flagged, needs validation)
- `skor_kepentingan` bucket formula, `saving_capacity` feasibility-ratio formula, strategy-toggle sort-override mechanism, category seed taxonomy — all `[ASSUMED]`, no repo or PRD source found this session; see Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, everything already installed and verified from Phase 1
- Architecture (SAW mechanics, batching pattern, schema): HIGH for mechanics, MEDIUM for schema (reasonable extension of existing `dompet` convention, not independently verified against a DBA review)
- Business formulas (`skor_kepentingan`, `saving_capacity`, strategy toggle, category seed data): LOW/ASSUMED — PRD §10.1 and the n=62 survey taxonomy document are not present in this repository; flagged prominently for team confirmation
- Pitfalls: HIGH for the infrastructure ones (IDOR, N+1, float tolerance — well-established FastAPI/Supabase patterns); MEDIUM for the two newly-surfaced ones this session (wallet `saldo` staleness, goal-deletion cascade) since they required cross-referencing Phase 1 code against Phase 2 requirements rather than being explicitly documented anywhere

**Research date:** 2026-07-05
**Valid until:** 2026-07-12 (7 days — fast-moving MVP timeline, and several ASSUMED formulas here are expected to be confirmed/revised by the team before/during planning)
