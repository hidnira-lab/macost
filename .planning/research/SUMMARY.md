# Project Research Summary

**Project:** Macost -- Pocket MIS for Indonesian University Students
**Domain:** Mobile-first personal finance / goal-based saving app (Android via Tauri 2.0)
**Researched:** 2026-06-30
**Confidence:** MEDIUM

## Executive Summary

Macost is a goal-based savings management app for Indonesian university students who juggle fixed allowances and side income. The core differentiator is a survey-validated SAW (Simple Additive Weighting) algorithm that ranks savings goals and triggers a suggest-and-confirm allocation modal whenever side income is detected -- a pattern no local competitor (Money Lover, Wallet, Spendee) currently offers. The stack is already locked: Next.js 16 static export wrapped by Tauri 2.0 for Android, FastAPI as the backend, and Supabase for auth and PostgreSQL. The architecture is sound but several configuration gaps are active blockers that must be resolved before parallel team development can begin safely.

The recommended build approach enforces strict layer separation: all data mutations via fetch() to FastAPI (no Server Actions, no direct Supabase from frontend), a lib/api/ abstraction with a USE_MOCK flag enabling frontend and backend development in parallel, and the SAW engine as a pure stateless function testable in isolation. The core user value loop -- enter side income, system suggests allocation, user confirms, goal advances -- must be the first complete vertical slice. All other features derive meaning from it.

The most dangerous risks are infrastructure/configuration mistakes that surface late: missing output: export causes a blank screen in the APK; dynamic routes without generateStaticParams crash the build; the SAW engine crashes on 0 or 1 goals due to division-by-zero. All easy to prevent on Day 1, expensive to fix on Day 9. The demo is July 14, 2026 -- the 10-day runway demands foundation-first, core-loop-second, polish-third sequencing with zero deviation.

## Key Findings

### Recommended Stack

The stack is already chosen and valid. Several critical configuration steps have not been applied. Next.js must have output: export and images: { unoptimized: true } -- without this, Tauri loads a blank screen. Supabase auth must use a custom tauri-plugin-store storage adapter rather than defaulting to localStorage, which is unreliable across Android WebView restarts. On the backend, python-jose must be replaced by PyJWT (abandoned, broken on Python >= 3.10). CORS middleware must be added to FastAPI on Day 1 with Tauri origins explicitly listed.

**Core technologies:**
- Next.js 16 (App Router, static export): Only viable frontend wrapper for Tauri -- SSR is incompatible
- Tauri 2.0: Only Android-capable version; requires Android Studio + NDK configured before first build
- FastAPI 0.138 + Pydantic v2: Backend API, SAW engine host, JWT enforcement layer
- Supabase (PostgreSQL + Auth): Managed auth (JWT HS256) and database; frontend uses for auth only
- PyJWT 2.x: JWT verification in FastAPI -- not python-jose
- SWR: Client-side data fetching for static export (no SSR available)
- Tailwind CSS v4: Already configured; uses @theme {} in globals.css, no tailwind.config.js needed
### Expected Features

**Must have (table stakes):**
- Auth (register/login/logout) -- nothing is personalized without it
- Manual transaction input (3 required fields maximum) -- primary data entry; friction equals churn
- Dashboard with 5 KPIs in research-validated order -- delivers immediate value after first transaction
- Goal creation + progress display -- the product emotional core
- Multi-wallet CRUD (GoPay, Cash, Bank) -- students use multiple wallets daily
- Transaction history with filtering and edit/delete -- inability to correct is an uninstall trigger
- Overspending alert -- expected in every finance app

**Should have (competitive differentiators):**
- Side income detection + server-side source labeling (FR-005) -- trigger gate for Smart Allocation; unique in local market
- SAW-ranked goal prioritization (FR-009) -- academic and product differentiator; n=62 survey-validated weights
- Allocation suggestion + confirmation modal (FR-010/011) -- the core wow moment; suggest-and-confirm, never auto-execute
- Quick Win / Importance-First strategy toggle (FR-013) -- user agency over ranking; no competitor surfaces this explicitly
- Receipt scan with OCR + user correction (FR-002/004) -- targets 47% of churners who cite friction as reason to quit
- One-way AI financial insights in Bahasa Indonesia (FR-012) -- targets 19% of churners who quit due to non-actionable reports
- Pixel art goal visualization (FR-015) -- gamification; Monzo data shows gamified savers save 30% more

**Defer (v2+):**
- E-statement PDF import (FR-003) -- complex PDF parsing pipeline; high value but not blocking for demo
- Offline transaction cache (FR-016) -- significant client complexity; demo does not require it
- Custom user-managed categories -- fragments flag_pemasukan taxonomy that drives source detection
- Real-time push notifications -- requires FCM infrastructure; pending suggestions page is sufficient
- Social/shared wallets -- different product category; dilutes personal finance identity

### Architecture Approach

Three layers: Next.js static export in Tauri WebView (no Node server), FastAPI backend owning all business logic (SAW engine, source labeling, allocation suggestion), and Supabase for auth and data. Frontend never accesses Supabase PostgreSQL directly. A thin lib/api/client.ts with USE_MOCK flag is the integration seam enabling four-person parallel development: frontend builds against mock JSON, backend builds against the locked API contract, switching to real API requires only a flag change.

**Major components:**
1. apps/web/lib/api/ -- API client layer with mock flag; single integration seam for all 4 developers
2. backend/services/saw_engine.py -- pure stateless function; no DB calls; takes goals + weights, returns ranked list
3. backend/dependencies.py -- JWTBearer; validates every Supabase JWT before any protected endpoint
4. backend/services/allocation_service.py -- computes suggested allocation amount (30-40% of side income)
5. apps/native/src-tauri/ -- Tauri wrapper; reads apps/web/out/ as static files; no IPC needed for MVP

### Critical Pitfalls

1. **Missing output: export in next.config.ts** -- Tauri APK shows blank screen. Fix on Day 1 before any frontend work.
2. **No generateStaticParams() on dynamic routes** -- next build fails; use query-parameter routing or modal pattern instead.
3. **SAW engine division by zero on 0 or 1 goals** -- HTTP 500 for new users; add guard clauses and unit tests before integration.
4. **Supabase session not persisting in Tauri WebView** -- users logged out after restart; fix with tauri-plugin-store storage adapter.
5. **API contract drift** -- lock API_CONTRACT.md to v1.0 with team sign-off; create TypeScript interfaces that mock and real responses both satisfy.
6. **Render free tier cold start (30-60s)** -- kills the demo; set up UptimeRobot keep-alive ping immediately after first backend deploy.
7. **LLM/Vision provider not chosen** -- FR-002 and FR-012 completely blocked until provider is selected and SDK installed.
## Implications for Roadmap

### Phase 1: Foundation (Kelompok 1)
**Rationale:** 6 of 13 pitfalls are SHOW-STOPPER configuration issues that silently break the build. Must be resolved before any feature work. Zero feature code -- entirely scaffolding, contracts, and environment.
**Delivers:** Working Tauri APK (blank but launches), locked API contract, mock-capable frontend shell, functioning JWT auth
**Addresses:** Auth (table stakes), developer environment for 4-person parallel team
**Avoids:** Pitfalls 1-6 (SHOW-STOPPER and DEMO-RISK configs), backend venv in git
**Key tasks:**
- Add output: export and images: { unoptimized: true } to apps/web/next.config.ts
- Scaffold apps/native/ and run one test tauri android build to verify Android toolchain on Day 1
- Lock API_CONTRACT.md to v1.0 with explicit team sign-off before any implementation
- Create apps/web/lib/api/client.ts with USE_MOCK flag and TypeScript interfaces in lib/api/types.ts
- Set up JWTBearer in FastAPI with PyJWT, HS256 algorithm, and audience: authenticated
- Add CORSMiddleware with tauri://localhost, http://localhost, http://localhost:3000 origins
- Add Supabase tauri-plugin-store storage adapter for session persistence across app restarts
- Set up UptimeRobot keep-alive ping on Render backend
- Fix .gitignore (remove heredoc wrapper lines), untrack backend/venv/
**Research flag:** No deeper research needed -- all patterns documented in official Tauri and Next.js docs

### Phase 2: Core Product Loop (Kelompok 2)
**Rationale:** The minimum viable value proposition is the complete side income to suggestion to confirmation to goal progress loop. Everything else is decoration. This phase must deliver a demonstrable end-to-end flow.
**Delivers:** Complete P1 feature set -- Expo demo can be run from this phase alone if time is short
**Addresses:** FR-001 (transactions), FR-005 (source labeling), FR-006 (dashboard), FR-007/008 (goals), FR-009 (SAW ranking), FR-010/011 (allocation suggest + confirm), FR-013 (strategy toggle), FR-018 (wallets)
**Avoids:** SAW division-by-zero (Pitfall 7), float precision in weight validation (Pitfall 8), missing allocation_suggestion_available flag (Pitfall 9), API contract drift (Pitfall 11)
**Key tasks:**
- Backend: wallets, categories, transactions with source_label, goals with SAW ranking, allocations, dashboard aggregation
- Frontend: all P1 pages per Figma -- dashboard, transaction input, goal list, allocation modal (Sitemap #16)
- SAW engine with edge case guards (empty list, single goal, identical criterion values)
- Integration test: POST side income to verify allocation modal appears within 2 seconds
- USE_MOCK=false integration session on Day 6-8
**Research flag:** SAW edge cases -- verify normalization formula handles all boundary conditions before integration

### Phase 3: Differentiators (Kelompok 3)
**Rationale:** P2 features directly target the two validated churn causes (47% friction, 19% non-actionable reports) but depend on core loop stability. AI features require a provider decision that must be made on Day 1 of this phase.
**Delivers:** FR-002/004 (receipt scan + correction), FR-012 (AI insights), FR-015 (pixel art), FR-014 (weight adjustment)
**Avoids:** AI provider not chosen (Pitfall 12)
**Key tasks:**
- Decide LLM/vision provider (GPT-4o Vision for OCR, Claude Haiku or GPT-3.5 for insights) -- must precede all implementation
- Implement backend/services/ai_service.py with 10s/15s hard timeouts and extracted: false fallback
- Receipt scan UI with immediate camera launch and user correction form (never auto-save extracted data)
- One-way AI insight display with action verb (Alokasikan, Kurangi, Pertimbangkan) linking to relevant goal
- Pixel art visualization -- pure frontend reading progress_pct; no new API endpoints needed
- SAW weight adjustment UI (FR-014)
**Research flag:** AI provider selection needs a spike to evaluate GPT-4o Vision vs Google Cloud Vision for Indonesian receipt OCR

### Phase 4: Hardening (Post-Demo Polish)
**Rationale:** Production-quality features not required for Expo demo but needed for real-world use.
**Delivers:** Offline cache (FR-016), pending allocations page, AI fallback handling (FR-017), demo-day verification
**Key tasks:**
- IndexedDB offline write queue via idb package (NOT service workers -- unreliable in Tauri Android WebView)
- Pending allocations GET endpoint and notifications page (Sitemap #17)
- Graceful AI fallback states (not infinite spinners)
- Full Looks Done But Is Not checklist verification from PITFALLS.md
- Render keep-alive verification; manual warm-up before demo presentation
**Research flag:** Standard patterns; no deeper research needed

### Phase Ordering Rationale

- Foundation must be Phase 1 because configuration mistakes silently break the entire build pipeline on a 10-day timeline with no slack.
- Core loop is Phase 2 because features have a strict dependency chain (Auth, Wallets, Transactions, Source Detection, Goals, SAW, Allocation) that cannot be meaningfully parallelized across phases.
- Differentiators are Phase 3 because receipt scan depends on transaction input existing, AI insights need transaction data, and both require an AI provider decision that blocks implementation.
- Hardening is Phase 4 because offline support wraps existing HTTP endpoints -- adding it before endpoints are stable creates rework.

### Research Flags

Phases needing deeper research during planning:
- **Phase 3:** AI/vision provider selection -- short spike needed before implementation to evaluate GPT-4o Vision vs Google Cloud Vision for Indonesian receipts

Phases with well-documented patterns (skip research-phase):
- **Phase 1:** All configuration steps documented in official Tauri and Next.js docs
- **Phase 2:** FastAPI + Supabase CRUD well-documented; SAW algorithm partially implemented in codebase
- **Phase 4:** IndexedDB via idb well-documented; no novel patterns
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core technologies verified via official docs. PyJWT migration and Tauri Android cleartext HTTP are LOW confidence (community sources). |
| Features | MEDIUM | Cross-verified across 8+ sources and internal n=62 survey. Churn percentages from internal survey -- sample size acceptable for academic context. |
| Architecture | MEDIUM | Official docs confirmed for Next.js static export and Tauri integration. Tauri Android WebView-specific behavior partially community-sourced. |
| Pitfalls | LOW-MEDIUM | Web search sources cross-checked against official docs. SAW division-by-zero is a logical inference from the algorithm structure. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **LLM/Vision provider:** No provider selected for FR-002 and FR-012. Must be decided at start of Phase 3. GPT-4o Vision recommended but needs a spike test against Indonesian receipts.
- **RLS policy design:** Supabase Row Level Security policies not yet defined. Service role key + manual user_id filter approach must be documented with SQL policies created in Phase 1 or 2.
- **Android NDK / toolchain setup:** Must be verified on Hidayat machine on Day 1. Toolchain issues are the most common cause of first-time Tauri Android build failures.
- **Figma component mapping:** Which Figma frame maps to which Next.js page needs to be established before Khayyira and Zarra begin implementation.

## Sources

### Primary (HIGH confidence)
- API_CONTRACT.md -- endpoint shapes, request/response contracts (project file)
- .planning/codebase/ARCHITECTURE.md and CONCERNS.md -- existing codebase analysis (project file)
- https://nextjs.org/docs/app/guides/static-exports -- unsupported features, configuration requirements
- https://v2.tauri.app/start/frontend/nextjs/ -- Tauri 2.0 Next.js integration guide
- https://v2.tauri.app/reference/config/ -- Tauri 2.0 config reference
- https://tailwindcss.com/blog/tailwindcss-v4 -- Tailwind v4 breaking changes

### Secondary (MEDIUM confidence)
- Macost internal survey n=62 -- 95.1% saving intent, 64.9% churn rate, 47% friction churn, 19% non-actionable churn
- NerdWallet, Netguru, OptimusAI -- personal finance app churn taxonomy and retention benchmarks
- Mambo.io -- fintech gamification data (Monzo 30% more savings; Revolut 2.5x retention)
- https://dev.to/j0/integrating-fastapi-with-supabase-auth-780 -- FastAPI + Supabase JWT pattern

### Tertiary (LOW confidence -- cross-check before implementing)
- https://github.com/tauri-apps/tauri/issues/10506 -- Android WebView cleartext HTTP blocking
- https://github.com/fastapi/fastapi/discussions/11345 -- FastAPI migration from python-jose to PyJWT
- SAW edge case normalization -- logical inference from algorithm structure
- Render cold start behavior -- community blog posts

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*