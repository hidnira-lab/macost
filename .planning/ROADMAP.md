# Roadmap: Macost

## Overview

Macost delivers its MVP across four vertical phases on a 10-day timeline (target: demo July 9-10, Expo July 14, 2026). Phase 1 establishes the correctly-configured foundation so all four developers can work in parallel without hitting environment blockers. Phase 2 delivers the complete core value loop — side income enters, SAW ranks goals, allocation suggestion appears, user confirms, goal advances — and is the minimum shippable demo on its own if time is critically short. Phase 3 adds the differentiators that directly target validated churn causes (receipt scan for 47% friction churners, AI insights for 19% non-actionable-report churners). Phase 4 polishes with pixel art goal visualization and offline reliability for a production-quality Expo demo.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Working Tauri APK with auth and wallet management; all 4 developers unblocked for parallel work
- [ ] **Phase 2: Core Product Loop** - Complete end-to-end flow: side income in → SAW ranks goals → allocation suggested → user confirms → goal advances
- [ ] **Phase 3: Differentiators** - Receipt scan, e-statement import, AI financial insights, and SAW weight customization
- [ ] **Phase 4: Polish** - Pixel art goal visualization and offline transaction cache for demo-day reliability

## Phase Details

### Phase 1: Foundation

**Goal**: All four developers can work in parallel on a correctly-configured codebase — the Tauri Android APK builds and launches, JWT auth works end-to-end via Supabase, and users can register, log in, and manage wallets
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, WALL-01, WALL-02, WALL-03, WALL-04
**Success Criteria** (what must be TRUE):

  1. User can register a new account with name, email, and password; the session persists across Tauri Android app restarts without re-login
  2. User can log in and log out; all protected API endpoints return 401 for requests that lack a valid Supabase JWT
  3. User can create, view, rename, and delete wallets (e.g., GoPay, Cash, Bank BCA)
  4. Running `tauri android build` produces an APK that launches to the auth screen without a blank screen
  5. Frontend switches cleanly between mock data and the real API by toggling USE_MOCK — no other code changes required

**Plans**: 2/4 plans executed

Plans:

- [ ] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [ ] 01-04-PLAN.md
- [ ] 01-PLAN-A.md — Track A: Next.js static export config, Tauri 2.0 Android scaffold, tauri-plugin-store, NDK verification (Hidayat)
- [ ] 01-PLAN-B.md — Track B: FastAPI scaffold, CORS, PyJWT JWTBearer, auth endpoints, wallet CRUD (Fertika)
- [ ] 01-PLAN-C.md — Track C: API client with USE_MOCK toggle, TypeScript interfaces, mock stubs (Khayyira)
- [ ] 01-PLAN-D.md — Track D: Session persistence layer, auth pages per Figma, wallet management UI (Zarra)

**Team ownership (parallel tracks):**

- Hidayat (`apps/native/`): Add `output: export` and `images.unoptimized: true` to next.config.ts; configure Tauri CORS origins (tauri://localhost, http://localhost:3000); add tauri-plugin-store Supabase session adapter; verify Android NDK toolchain with one test APK build; set up UptimeRobot keep-alive on Render backend URL
- Fertika (`backend/`): FastAPI project scaffold with PyJWT (not python-jose) JWTBearer dependency; CORSMiddleware with Tauri origins listed; Supabase user sync on register; wallet CRUD endpoints; Supabase RLS policies for user-scoped data
- Khayyira (`apps/web/` Goals area): `lib/api/client.ts` with USE_MOCK flag; TypeScript interfaces in `lib/api/types.ts`; mock JSON stubs for goals and allocations
- Zarra (`apps/web/` Home/Dashboard): Auth pages (register / login / logout) per Figma; wallet management UI per Figma; mock JSON stubs for wallets and dashboard KPIs

**Key risks (from research):**

- Missing `output: export` in next.config.ts produces a blank APK screen — fix on Day 1 before any frontend work begins
- Supabase session defaulting to localStorage gets lost on Tauri Android WebView restart — tauri-plugin-store adapter is mandatory
- python-jose is incompatible with Python 3.10+ — use PyJWT 2.x from project start
- Android NDK/toolchain issues are the most common first-time Tauri build failure — verify Day 1 on Hidayat's machine

**UI hint**: yes

---

### Phase 2: Core Product Loop

**Goal**: A user can enter a side income transaction, receive an SAW-ranked allocation suggestion within 2 seconds, confirm or skip it, and watch their goal progress update — the complete product value proposition works end-to-end and is demoable as a standalone Expo presentation
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, DASH-01, DASH-02, GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, SAW-01, SAW-02, SAW-03, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04, ALLOC-05
**Success Criteria** (what must be TRUE):

  1. User enters a transaction using 3 fields or fewer (amount, category, wallet); side income is automatically labeled "Side Income" by the server — the frontend never sends a source field
  2. An allocation suggestion modal appears within 2 seconds of saving a side income transaction, recommending 30-40% of the income toward the top SAW-ranked goal; the system never executes allocation without explicit user confirmation
  3. User can confirm the suggested allocation (goal progress advances immediately) or skip it (suggestion is saved as a pending item visible on the pending allocations page)
  4. User can create a savings goal, see goals ranked by the SAW algorithm, and toggle between Quick Win and Importance-First strategy — the ranking order visibly changes on toggle
  5. Dashboard displays the 5 KPIs in the research-validated sequence (expense breakdown → goal progress → monthly trend → overspending alert → total balance) and updates when the user changes the period filter

**Plans**: TBD

**Team ownership (parallel tracks):**

- Hidayat (integration): USE_MOCK=false integration sessions Days 6-8; end-to-end integration test verifying allocation modal appears ≤2 seconds after side income POST; Tauri APK smoke test of full allocation flow
- Fertika (`backend/`): Transaction CRUD with auto source_label from flag_pemasukan; SAW engine with edge case guards (0 goals, 1 goal, identical criteria values); allocation_service computing 30-40% suggestion; dashboard aggregation endpoints (5 KPIs + period filter); pending allocations GET endpoint
- Khayyira (`apps/web/` Goals area): Goal list, goal detail, goal create/edit/delete pages per Figma; allocation confirmation modal (Sitemap #16); pending allocations page (Sitemap #17); SAW strategy toggle
- Zarra (`apps/web/` Home/Dashboard): Dashboard page with 5 KPIs and period filter per Figma; transaction input form (max 3 required fields); transaction history with filter, edit, delete; wallet balance updates after transaction

**Key risks (from research):**

- SAW division-by-zero on 0 or 1 goals returns HTTP 500 for new users — SAW-02 edge case guards are mandatory before backend integration
- API contract drift between TypeScript mock interfaces and real backend response shapes — validate against actual API responses on Day 6 integration session, not at the end
- Allocation modal must appear ≤2 seconds on real backend (not just mock) — test on Render deployment, not localhost only
- Render free tier cold start (30-60s) kills a live demo — UptimeRobot keep-alive must be verified active before Phase 2 integration testing begins

**UI hint**: yes

---

### Phase 3: Differentiators

**Goal**: Users can photograph a receipt to auto-populate a transaction, import an e-statement PDF for bulk entry, view AI financial insights in Bahasa Indonesia with actionable verbs, and fine-tune SAW criteria weights — directly targeting the two validated churn causes (47% friction, 19% non-actionable reporting)
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SCAN-01, SCAN-02, SCAN-03, ESTAT-01, ESTAT-02, ESTAT-03, AIINS-01, AIINS-02, AIINS-03, SAW-04, SAW-05
**Success Criteria** (what must be TRUE):

  1. User can photograph or upload a receipt image; the app pre-populates merchant, amount, date, and suggested category; user reviews and corrects any field before saving — extracted data is never auto-saved without review; if extraction fails or exceeds 10 seconds, a fallback message directs the user to manual input
  2. User can upload an e-statement PDF; the app displays extracted transactions with possible-duplicate flags; user selects which to import; after confirmation the app reports how many transactions were imported and how many were skipped
  3. User can open a financial insights page and read AI-generated insights in Bahasa Indonesia, each with an action verb (Alokasikan, Kurangi, Pertimbangkan) linking to a relevant goal or category; if the LLM does not respond within 15 seconds, a fallback message directs the user to the Goals page
  4. User can open SAW weight settings, adjust the five criteria weights (must sum to 100% ± 0.001), see goal ranking update in response, and reset all weights to the research-default values from the n=62 survey

**Plans**: TBD

**Key risks (from research):**

- AI/vision provider is not yet selected — must decide between GPT-4o Vision and Google Cloud Vision at the very start of Phase 3; this decision gates SCAN-01 and AIINS-01 completely
- Indonesian receipt OCR quality varies significantly by provider — run a spike test against 3-5 real struk images before committing to a provider
- LLM latency must be capped at 15 seconds with graceful fallback — no infinite spinners; enforce hard timeout server-side, not only on the frontend

**UI hint**: yes

---

### Phase 4: Polish

**Goal**: Goal progress is displayed as evolving pixel art, offline transactions queue and sync automatically, and the app is hardened for a reliable Expo demo on July 14
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: VIS-01, OFF-01, OFF-02
**Success Criteria** (what must be TRUE):

  1. Each goal page shows pixel art that visibly evolves in appearance as goal progress percentage increases (at minimum, distinct states at 0%, 25%, 50%, 75%, and 100%)
  2. A transaction input while the device is offline is stored locally in IndexedDB and automatically syncs to the backend when connectivity is restored — the user does not need to retry manually
  3. The UI displays a clear sync status indicator (offline / syncing / synced) so users always know whether their data has reached the server

**Plans**: TBD

**Key risks (from research):**

- Service workers are unreliable inside the Tauri Android WebView — use the idb package for IndexedDB offline queue, not a service worker
- Render backend cold start at demo time — verify UptimeRobot keep-alive is active and perform a manual warm-up request before the Expo audience arrives on July 14

**UI hint**: yes

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

**Critical path note:** If time is critically short before the July 9-10 demo, Phase 2 alone is the minimum shippable demo. Phase 3 and 4 add Expo differentiators.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/4 | In Progress|  |
| 2. Core Product Loop | 0/TBD | Not started | - |
| 3. Differentiators | 0/TBD | Not started | - |
| 4. Polish | 0/TBD | Not started | - |
