# Phase 2: Core Product Loop - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the complete core value loop of Macost end-to-end: user enters a transaction (with side income auto-labeled server-side), goals are ranked in real time by the SAW algorithm, a side-income transaction triggers a suggest-and-confirm allocation modal, the user confirms or skips it, and goal progress updates immediately. Covers Transactions (TRAN-01–05), Dashboard (DASH-01–02), Goals (GOAL-01–05), SAW Engine (SAW-01–03), and Smart Allocation (ALLOC-01–05). This phase is the minimum shippable demo on its own if timeline is critically short before the July 9-10 demo.

</domain>

<decisions>
## Implementation Decisions

### Transaction quick-entry form
- **D-01:** `tipe_transaksi` (Pemasukan/Pengeluaran) is derived from the selected category, not a separate required field. Every category already carries `flag_pemasukan` (same field that drives `source_label`); the frontend sends `kategori_id` only and the backend resolves `tipe_transaksi` from it. This keeps the "3 required fields" (nominal, kategori, dompet) intact and stays consistent with the already-locked rule that source/type labeling is server-side, never sent manually by the frontend.
- **D-02:** `tanggal_transaksi` is required by API_CONTRACT.md but does not count against the "3 required fields" budget — it defaults to today's date, pre-filled and visible in the form, editable by the user when the transaction isn't from today.

### Allocation suggestion modal — timing & failure handling
- **D-03:** Immediately after `POST /api/transactions` succeeds for a side-income transaction, show a loading overlay ("Menghitung saran alokasi...") while `GET /api/transactions/{id}/allocation-suggestion` is in flight, then transition directly into the allocation suggestion modal once the response arrives.
- **D-04:** No hard client-side timeout on the allocation-suggestion request. The overlay stays until the response arrives (the ≤2 second target from ROADMAP.md success criteria is a backend/integration-test target, not something to mask by cutting the frontend wait short). If the request errors out entirely, dismiss the overlay, show a short error toast, and leave the transaction saved — the user can still act on it later via the Pending Allocations page.

### SAW strategy toggle (Quick Win vs Importance-First)
- **D-05:** Toggling strategy on the Goals page is a real, persisted preference change: it immediately calls `PUT /api/goal-settings` with the new `strategy` value (weights unchanged), then refetches `GET /api/goals` so ranking re-renders under the new strategy. This is not a client-side-only preview — it matches FR-013's framing of strategy as a genuine user preference, not a transient view toggle.

### Empty states (new user, zero data)
- **D-06:** When a user has no transactions and/or no goals yet, Dashboard KPIs and the Goals page each show a lightweight, section-scoped empty message (e.g., "Belum ada pengeluaran bulan ini") paired with one relevant CTA (e.g., "Tambah transaksi pertama", "Buat goal pertama") — not a single full-page illustrated empty state. Keeps build effort low and matches the minimal-pixel-art visual style already established, rather than requiring new large illustration assets from Figma.

### Claude's Discretion
- Exact docker/component structure for the transaction form, allocation modal, and empty-state components.
- Precise wording of empty-state messages and toast copy (Bahasa Indonesia, matching existing tone).
- Where exactly the SAW strategy toggle control sits in the Goals page layout (per Figma frame once implemented).
- SAW engine edge-case implementation details (0 goals, 1 goal, identical values) — behavior is already locked by SAW-02 in REQUIREMENTS.md; only the code structure is Claude's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API contract (locked shapes — do not deviate without team-wide discussion)
- `API_CONTRACT.md` §4 (Transactions) — request/response shapes for POST/GET/PUT/DELETE `/api/transactions`, receipt scan, e-statement upload (Phase 3, not this phase)
- `API_CONTRACT.md` §5 (Goals) — `GET/POST/PUT/DELETE /api/goals`, derived `nominal_terkumpul`/`progress_pct`/`rank` fields
- `API_CONTRACT.md` §6 (Goal Prioritization Settings) — `GET/PUT /api/goal-settings`, weight-sum validation (must equal 1.0)
- `API_CONTRACT.md` §7 (Smart Allocation) — `GET /api/transactions/{id}/allocation-suggestion`, `POST /api/allocations`, `POST /api/allocations/{transaction_id}/skip`, `GET /api/allocations/pending`
- `API_CONTRACT.md` §8 (Dashboard) — `GET /api/dashboard`, KPI field order is intentional (research-validated), not arbitrary

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — TRAN-01–05, DASH-01–02, GOAL-01–05, SAW-01–05 (SAW-04/05 are Phase 3), ALLOC-01–05
- `.planning/ROADMAP.md` §Phase 2 (lines 85-116) — goal, success criteria, team ownership, key risks (SAW div-by-zero, API contract drift, ≤2s allocation modal on real backend not just localhost, Render/Railway cold-start risk)

### Business rules (locked, from CLAUDE.md)
- `CLAUDE.md` / `.claude/CLAUDE.md` — SAW algorithm lives in `backend/services/saw_engine.py`; 5 criteria weights (personal_importance 22.5%, progress_gap 21.9%, saving_capacity 21.5%, urgency 17.8%, target_amount 16.2%); Smart Allocation always suggest-and-confirm, never auto-execute; source labeling always server-side from `flag_pemasukan`

### Design source of truth
- Figma (per CLAUDE.md "Sumber Desain UI") — request the relevant frame link before implementing any Goals/Transactions/Dashboard/Allocation-modal UI; do not build from text description alone

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/mocks/dashboard.json`, `goals.json`, `transactions.json`, `allocation-suggestion.json` — already mirror the API_CONTRACT.md response shapes; use these for frontend dev ahead of backend readiness (mock-first pattern established in Phase 1).
- `apps/web/lib/api/client.ts` — has the established `USE_MOCK` toggle pattern; new Transactions/Goals/Dashboard/Allocation API calls should follow the same `apiFetch` (mock-able reads) vs `apiMutate` (always real) split used for wallets.
- `backend/routers/wallets.py` + `backend/models/wallet.py` — the only existing CRUD router/model pair; use as the direct structural template for new `transactions.py`, `goals.py`, `allocations.py` routers and their Pydantic models.
- `backend/dependencies/auth.py` — JWT dependency already working end-to-end (JWKS-based); reuse directly for all new Phase 2 endpoints.

### Established Patterns
- Source/type labeling is resolved server-side from category `flag_pemasukan` — this phase extends the same pattern to `tipe_transaksi` derivation (see D-01).
- No backend models/routers exist yet for transactions, goals, goal-settings, or allocations — this is greenfield work following the wallets.py structural precedent, not a refactor.

### Integration Points
- `apps/web/lib/auth/session.ts` — `getToken()` already implemented; new authenticated API calls (transactions, goals, allocations) attach the same bearer token.
- Dashboard, Goals, and Transactions pages don't exist yet under `apps/web/app/` (only `wallets/page.tsx` and the `(auth)` routes exist) — this phase creates them fresh, following the routing conventions already set by `wallets/page.tsx`.

</code_context>

<specifics>
## Specific Ideas

No specific visual/behavioral references beyond the decisions above — Figma frames are the source of truth for exact layout and will be requested per-page during implementation, per CLAUDE.md's UI workflow.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope. Receipt scan, e-statement import, AI insights, SAW weight adjustment (SAW-04/05), and Quick Access Panel are already correctly scoped to Phase 3 per ROADMAP.md and were not raised as in-scope requests during this discussion.

</deferred>

---

*Phase: 2-Core Product Loop*
*Context gathered: 2026-07-05*
