<!-- refreshed: 2026-06-30 -->
# Architecture

**Analysis Date:** 2026-06-30

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     Client Layer                                  │
├────────────────────────────┬─────────────────────────────────────┤
│   apps/web/                │   apps/native/                      │
│   Next.js 16 (App Router)  │   Tauri 2.0 wrapper                 │
│   TypeScript + Tailwind    │   (wraps web static export)         │
└────────────────┬───────────┴──────────────────┬──────────────────┘
                 │  HTTP REST (JSON)             │  WebView / Tauri IPC
                 ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Backend Layer                                 │
│   backend/main.py  — FastAPI (Python)                            │
│   Base URL (dev): http://localhost:8000                          │
│   Auth: Supabase JWT Bearer token on all protected endpoints     │
└────────────────────────────────┬─────────────────────────────────┘
                                 │  Supabase client (PostgreSQL)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│   Supabase (PostgreSQL + Auth)                                   │
│   Handles: user auth, data persistence, RLS policies             │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File/Path |
|-----------|----------------|-----------|
| Next.js Web App | UI rendering, routing, API calls to backend | `apps/web/` |
| Tauri Native Wrapper | Packages web static export as Android app | `apps/native/` |
| FastAPI Backend | Business logic, data access, AI/SAW engine | `backend/main.py` |
| SAW Engine | Goal ranking via weighted multi-criteria scoring | `backend/services/saw_engine.py` (planned) |
| Supabase | Auth (JWT), PostgreSQL database, RLS | External (managed) |
| Mock Data | Static JSON fixtures for frontend dev before API is ready | `apps/web/mocks/` |

## Pattern Overview

**Overall:** Three-tier client-server with a mobile packaging layer

**Key Characteristics:**
- REST API contract is the single source of truth (`API_CONTRACT.md`) — frontend and backend develop against it independently
- Frontend uses local JSON mocks (`apps/web/mocks/`) during backend development
- No direct database access from frontend — all data goes through FastAPI
- Source labeling (Allowance vs Side Income) is server-side only, derived from category's `flag_pemasukan` field
- Smart Allocation always suggest-and-confirm, never auto-execute

## Layers

**Presentation Layer:**
- Purpose: UI, navigation, user interaction
- Location: `apps/web/app/`
- Contains: Next.js pages (App Router), layouts, components
- Depends on: Backend REST API (or mocks during dev)
- Used by: End users via browser or Tauri-wrapped Android app

**API Contract Layer:**
- Purpose: Shared interface specification between frontend and backend
- Location: `API_CONTRACT.md` (repo root)
- Contains: All endpoint definitions, request/response shapes, error formats
- Depended on by: Both `apps/web/` and `backend/`

**Backend Service Layer:**
- Purpose: Business logic, validation, AI/SAW computation
- Location: `backend/`
- Contains: FastAPI app, route handlers, service modules (planned)
- Depends on: Supabase (auth + DB)

**Native Packaging Layer:**
- Purpose: Wrap the Next.js static export for Android (target) and PWA (fallback)
- Location: `apps/native/`
- Contains: Tauri 2.0 configuration (scaffold — not yet populated)

## Data Flow

### Primary Request Path (logged-in user)

1. User action in browser/app — `apps/web/app/` page component
2. Frontend sends HTTP request with `Authorization: Bearer <supabase_jwt>` to `http://localhost:8000` (dev) or `https://macost-api.onrender.com` (prod)
3. FastAPI validates JWT with Supabase, executes business logic
4. Response JSON returned to frontend per shape defined in `API_CONTRACT.md`
5. UI re-renders with new data

### Side Income Allocation Flow

1. User records a Side Income transaction — `POST /api/transactions`
2. Backend response includes `allocation_suggestion_available: true`
3. Frontend detects flag and immediately calls `GET /api/allocation/suggest` (endpoint #7 in `API_CONTRACT.md`)
4. Allocation suggestion modal shown to user (Sitemap page #16)
5. User confirms or dismisses — no auto-execution ever occurs

### Receipt Scan Flow

1. User uploads image — `POST /api/transactions/scan-receipt` (multipart/form-data)
2. Backend extracts merchant, amount, date, items, suggested category
3. Returns `extracted: true` with pre-filled fields, or `extracted: false` with fallback message
4. User reviews and confirms before transaction is saved

### Goal Ranking (SAW Engine)

1. User requests goal recommendations
2. Backend `saw_engine.py` (planned path) scores each goal against 5 criteria:
   - `personal_importance` 22.5%
   - `progress_gap` 21.9%
   - `saving_capacity` 21.5%
   - `urgency` 17.8%
   - `target_amount` 16.2%
3. Returns ranked list with `rank` field — see `apps/web/mocks/goals.json`

**State Management:**
- No global client-side state library detected (scaffold stage)
- Server state managed via direct API calls; client state local to components

## Key Abstractions

**Transaction:**
- Purpose: Core financial event (income or expense)
- Fields: `tipe_transaksi`, `nominal`, `tanggal_transaksi`, `dompet_id`, `kategori_id`, `source_label` (server-assigned)
- Mock: `apps/web/mocks/transactions.json`

**Goal:**
- Purpose: Savings target with SAW-computed priority rank
- Fields: `id_goal`, `nominal_target`, `nominal_terkumpul`, `deadline`, `skor_keinginan`, `skor_kepentingan`, `progress_pct`, `rank`
- Mock: `apps/web/mocks/goals.json`

**Category:**
- Purpose: Classifies transactions; determines `source_label` server-side via `flag_pemasukan`
- Read-only for MVP — seeded from research data
- Endpoint: `GET /api/categories`

**Wallet (Dompet):**
- Purpose: Named money container (e.g., Gopay, Cash) with balance
- CRUD: `GET/POST/PUT/DELETE /api/wallets`

**Allocation Suggestion:**
- Purpose: Smart suggestion for distributing Side Income across goals
- Mock: `apps/web/mocks/allocation-suggestion.json`
- Never auto-executed — always shown as modal for user confirmation

## Entry Points

**Frontend (web):**
- Location: `apps/web/app/layout.tsx` — root layout with global fonts and body wrapper
- Location: `apps/web/app/page.tsx` — root page (scaffold, Next.js default)
- Triggers: Browser navigation or Tauri WebView load

**Backend:**
- Location: `backend/main.py` — FastAPI app instantiation and root health route
- Triggers: uvicorn server start; HTTP requests on port 8000

## Architectural Constraints

- **API contract is locked per release:** Any change to request/response shapes in `API_CONTRACT.md` must be communicated to all four team members before implementation — see contract preamble
- **Source labeling is server-only:** Frontend must never send a `source` field for income transactions; backend derives it from the category's `flag_pemasukan`
- **Static export for Tauri:** Next.js must be configured for static export (`output: 'export'`) when building for `apps/native/` — not yet configured in `apps/web/next.config.ts`
- **No auto-allocation:** Smart Allocation must always present a confirmation step before executing any fund movement
- **Team-scoped branches:** Each team member works on a separate branch; direct commits to `main` are prohibited

## Anti-Patterns

### Sending `source` from frontend

**What happens:** Frontend manually sets `source: "Allowance"` or `source: "Side Income"` in a transaction POST request.
**Why it's wrong:** `API_CONTRACT.md` explicitly states source is determined server-side from `flag_pemasukan` of the chosen category.
**Do this instead:** Send only `kategori_id`; read `source_label` back from the response.

### Auto-executing Smart Allocation

**What happens:** On receiving `allocation_suggestion_available: true`, frontend immediately applies the allocation without showing the confirmation modal.
**Why it's wrong:** Product requirement (CLAUDE.md rule #4) mandates suggest-and-confirm flow.
**Do this instead:** Call `GET /api/allocation/suggest`, display the modal from Sitemap page #16, execute only after explicit user confirmation.

### Bypassing the API contract

**What happens:** Adding or changing endpoint shapes in `backend/main.py` without updating `API_CONTRACT.md`.
**Why it's wrong:** Frontend mock data and API calls are coupled to the contract; silent drift causes integration failures.
**Do this instead:** Update `API_CONTRACT.md` first, communicate to all team members, then implement.

## Error Handling

**Strategy:** Consistent error envelope from backend

**Patterns:**
- All error responses use `{ "error": { "code": "...", "message": "..." } }` shape
- Account lockout returns HTTP 423 with code `ACCOUNT_LOCKED`
- Frontend should check HTTP status code first, then parse `error.code` for user-facing messages

## Cross-Cutting Concerns

**Logging:** Not yet defined (backend scaffold only)
**Validation:** Server-side via FastAPI (Pydantic expected); client-side not yet implemented
**Authentication:** Supabase Auth JWT; token passed as `Authorization: Bearer <token>` on all protected endpoints

---

*Architecture analysis: 2026-06-30*
