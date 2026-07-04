<!-- GSD:project-start source:PROJECT.md -->

## Project

**Macost**

Pocket Management Information System (MIS) untuk mahasiswa Indonesia yang berpendapatan campuran — fixed allowance dari orang tua dan side income dari freelance/part-time. Macost membantu pengguna mencatat transaksi, mengelola goal tabungan dengan visual pixel art, dan mendapatkan saran alokasi cerdas (berbasis SAW) setiap kali side income masuk. Project semester 4 PSI, Tim Zephyra UII, dikerjakan 4 orang secara paralel.

**Core Value:** Saat side income masuk, sistem langsung menyarankan alokasi ke goal prioritas tertinggi — dengan proses suggest-and-confirm yang tidak pernah auto-execute, sehingga user tetap memegang kendali penuh atas keuangannya.

### Constraints

- **Timeline:** MVP siap 9-10 Juli 2026, Expo 14 Juli 2026 — sangat ketat, ~10 hari dari sekarang (per 30 Juni 2026)
- **Tech stack:** Next.js harus dikonfigurasi sebagai static export untuk Tauri wrapper (belum dikonfigurasi di `next.config.ts`)
- **UX non-negotiable:** Smart Allocation selalu suggest-and-confirm; tidak ada pengecualian
- **API contract:** Setiap perubahan shape endpoint di `API_CONTRACT.md` harus dikomunikasikan ke 4 anggota tim sebelum diimplementasikan
- **Source labeling:** Frontend tidak pernah mengirim field `source` — selalu baca `source_label` dari response backend
- **SAW weights:** Default weights dari survey n=62 adalah baku; user hanya bisa override lewat FR-014 di goal-settings
- **MVP target (final, 2026-07-04):** Web (Vercel) + Tauri Desktop saja. Android (Tauri Mobile) dan PWA: post-MVP, dikerjakan setelah MVP solid — lihat ROADMAP.md Phase 999.1.
- **Platform ownership (Vercel/Railway/Supabase, Phase 2/3/4):** Hidayat adalah pemegang akun tunggal untuk tiga platform eksternal ini. Task yang butuh env var baru atau ubah dashboard setting di salah satunya wajib di-scope terpisah khusus Hidayat — tidak boleh memblokir Fertika/Khayyira/Zarra; mereka pakai placeholder/mock dulu, baru wiring setelah Hidayat selesai setup. Alur detail: `docs/PANDUAN_TEKNIKAL_TIM.md` Section 2a.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.x - Frontend (`apps/web/`) — all `.ts` and `.tsx` files
- Python 3.12 - Backend (`backend/`) — all `.py` files
- CSS (Tailwind utility classes) - Styling in `apps/web/app/globals.css`

## Runtime

- Node.js (version not pinned; `apps/web/` uses `"@types/node": "^20"` as minimum)
- Python 3.12 (inferred from `backend/venv/Lib/site-packages/` bytecode `cpython-312`)
- npm — `apps/web/package-lock.json` present
- pip — Python venv at `backend/venv/`
- Lockfile: `apps/web/package-lock.json` (Node); no `requirements.txt` committed (venv only, no pinned lockfile outside venv)

## Frameworks

- Next.js 16.2.9 (`apps/web/`) - App Router, TypeScript, static export target for Tauri wrapper
- React 19.2.4 (`apps/web/`) - UI rendering
- FastAPI 0.138.2 (`backend/`) - REST API server
- Starlette 1.3.1 (`backend/`) - ASGI foundation under FastAPI
- Tailwind CSS 4.x (`apps/web/`) - Utility-first CSS; configured via `@tailwindcss/postcss`
- ESLint 9.x with `eslint-config-next` 16.2.9 (`apps/web/`) - Linting
- TypeScript strict mode (`apps/web/tsconfig.json` — `"strict": true`)
- Uvicorn 0.49.0 (`backend/`) - ASGI server for FastAPI
- Tauri 2.0 (`apps/native/`) - Desktop wrapper for MVP; Android mobile target is post-MVP (Phase 999.1)
- Not yet configured (no test framework found in either `apps/web/package.json` or backend venv)

## Key Dependencies

- `next` 16.2.9 - Full-stack framework; drives routing, SSR/static export for Tauri
- `fastapi` 0.138.2 - All API endpoints defined here; see `API_CONTRACT.md`
- `pydantic` 2.13.4 - Request/response validation in FastAPI models
- `supabase` - PostgreSQL + Auth provider (SDK not yet installed in venv; used via REST/JWT at runtime per `API_CONTRACT.md`)
- `uvicorn` 0.49.0 - Production ASGI runner for `backend/main.py`
- `python-multipart` 0.0.32 - Form data parsing for FastAPI
- `anyio` 4.14.1 - Async I/O abstraction used by FastAPI/Starlette
- `pydantic-core` 2.46.4 - Rust-based core for Pydantic 2.x

## Configuration

- No `.env` files committed; environment variables are expected at runtime
- Required vars (from `API_CONTRACT.md`): Supabase URL, Supabase anon/service key, JWT secret
- Backend base URL dev: `http://localhost:8000`; prod: `https://macost-production.up.railway.app` (Railway, live)
- `apps/web/next.config.ts` - Minimal config (no static export flag set yet; needed before Tauri integration)
- `apps/web/tsconfig.json` - Strict TypeScript; path alias `@/*` maps to repo root of `apps/web/`
- Local dev now runs via `docker compose up` from the repo root — two services: backend on :8000, frontend on :3000; no local Postgres container, Supabase stays hosted-only (D-02)

## Platform Requirements

- Node.js >= 20
- Python 3.12
- npm for frontend dependency management
- Python venv (`backend/venv/`) for backend
- Backend: Railway (FastAPI via Uvicorn) — auto-deploys on push to main (D-06); no manual approval step, no staging environment. Live at `https://macost-production.up.railway.app`
- Frontend: Vercel (apps/web's static export, primary web deploy target, auto-deploys on push to main per D-06); Tauri 2.0 Desktop build (static Next.js export). Android APK and PWA fallback: post-MVP, not part of current deploy targets.
- Database: Supabase (managed PostgreSQL)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- React component files: PascalCase with `.tsx` extension — e.g., `layout.tsx`, `page.tsx`
- Config files: kebab-case — e.g., `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- Mock data files: kebab-case with `.json` extension — e.g., `allocation-suggestion.json`, `dashboard.json`
- Python files: snake_case — e.g., `main.py`, `saw_engine.py` (per CLAUDE.md reference)
- React components: PascalCase — e.g., `Home`, `RootLayout`
- Python functions: snake_case — e.g., `read_root`
- Next.js page exports must use `default export function <ComponentName>` pattern
- TypeScript/JS: camelCase — e.g., `geistSans`, `geistMono`
- Python: snake_case
- TypeScript types: PascalCase — e.g., `Metadata`, `NextConfig`
- Import types explicitly with `import type` — e.g., `import type { Metadata } from "next"`
- All IDs: string UUID format — e.g., `id_pengguna`, `id_goal`, `id_transaksi`
- All money amounts: `number` (integer, Rupiah, no decimals)
- All dates: ISO 8601 string — `"2026-06-27"` for dates, `"2026-06-27T10:00:00Z"` for datetimes
- Indonesian field names for domain entities — e.g., `nama_goal`, `nominal_target`, `tipe_transaksi`
- English field names for meta/technical fields — e.g., `rank`, `progress_pct`, `has_active_goal`

## Code Style

- No Prettier config detected — formatting deferred to ESLint
- TypeScript strict mode enabled (`"strict": true` in `apps/web/tsconfig.json`)
- Target: ES2017
- ESLint 9 with flat config (`apps/web/eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run: `npm run lint` from `apps/web/`
- No linting config detected in `backend/` — FastAPI scaffold only
- Prescribed: follow PEP 8 (snake_case, 4-space indent)

## Import Organization

- `@/*` maps to `./` (repo root of `apps/web/`) — configured in `apps/web/tsconfig.json`
- Use `@/` prefix for all local imports — e.g., `@/components/Button`

## Error Handling (Prescribed — from `API_CONTRACT.md`)

- `VALIDATION_ERROR` — invalid request body
- `ACCOUNT_LOCKED` — too many failed login attempts (returns HTTP 423)
- Use HTTP status codes correctly: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 423 Locked
- Return structured error bodies, not plain strings
- Handle `allocation_suggestion_available: true` signal from `POST /api/transactions` response to trigger allocation modal
- Handle `has_active_goal: false` from allocation suggestion endpoint to show "Buat goal dulu" prompt
- Handle `insight_available: false` to show `fallback_message` instead

## Business Logic Constraints (Prescribed)

- Never send `source` from frontend — server determines it from `kategori_id`'s `flag_pemasukan` field
- Frontend sends only `kategori_id`; backend resolves label automatically
- Always suggest-then-confirm; never auto-execute
- SAW algorithm lives in `backend/services/saw_engine.py`
- 5 criteria weights: `personal_importance` (22.5%), `progress_gap` (21.9%), `saving_capacity` (21.5%), `urgency` (17.8%), `target_amount` (16.2%)
- Sum of all weights in `PUT /api/goal-settings` must equal exactly 1.0

## Logging

## Comments

## Module Design

- Next.js App Router conventions: `app/page.tsx` for route pages, `app/layout.tsx` for layout wrappers
- `export default` for page components, named exports for utilities
- No barrel files detected yet
- FastAPI app instance created once in `backend/main.py` as `app = FastAPI(...)`
- Services go in `backend/services/` (e.g., `saw_engine.py`)

## Mock Data

- `apps/web/mocks/dashboard.json` — mirrors `GET /api/dashboard` response
- `apps/web/mocks/goals.json` — mirrors `GET /api/goals` response
- `apps/web/mocks/transactions.json` — mirrors `GET /api/transactions` response
- `apps/web/mocks/allocation-suggestion.json` — mirrors `GET /api/transactions/{id}/allocation-suggestion` response

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File/Path |
|-----------|----------------|-----------|
| Next.js Web App | UI rendering, routing, API calls to backend | `apps/web/` |
| Tauri Native Wrapper | Packages web static export as Desktop app (MVP target); Android is post-MVP | `apps/native/` |
| FastAPI Backend | Business logic, data access, AI/SAW engine | `backend/main.py` |
| SAW Engine | Goal ranking via weighted multi-criteria scoring | `backend/services/saw_engine.py` (planned) |
| Supabase | Auth (JWT), PostgreSQL database, RLS | External (managed) |
| Mock Data | Static JSON fixtures for frontend dev before API is ready | `apps/web/mocks/` |

## Pattern Overview

- REST API contract is the single source of truth (`API_CONTRACT.md`) — frontend and backend develop against it independently
- Frontend uses local JSON mocks (`apps/web/mocks/`) during backend development
- No direct database access from frontend — all data goes through FastAPI
- Source labeling (Allowance vs Side Income) is server-side only, derived from category's `flag_pemasukan` field
- Smart Allocation always suggest-and-confirm, never auto-execute

## Layers

- Purpose: UI, navigation, user interaction
- Location: `apps/web/app/`
- Contains: Next.js pages (App Router), layouts, components
- Depends on: Backend REST API (or mocks during dev)
- Used by: End users via browser or Tauri-wrapped desktop app (Android is post-MVP)
- Purpose: Shared interface specification between frontend and backend
- Location: `API_CONTRACT.md` (repo root)
- Contains: All endpoint definitions, request/response shapes, error formats
- Depended on by: Both `apps/web/` and `backend/`
- Purpose: Business logic, validation, AI/SAW computation
- Location: `backend/`
- Contains: FastAPI app, route handlers, service modules (planned)
- Depends on: Supabase (auth + DB)
- Purpose: Wrap the Next.js static export for Desktop (MVP target). Android and PWA are post-MVP.
- Location: `apps/native/`
- Contains: Tauri 2.0 configuration (scaffold — not yet populated)

## Data Flow

### Primary Request Path (logged-in user)

### Side Income Allocation Flow

### Receipt Scan Flow

### Goal Ranking (SAW Engine)

- No global client-side state library detected (scaffold stage)
- Server state managed via direct API calls; client state local to components

## Key Abstractions

- Purpose: Core financial event (income or expense)
- Fields: `tipe_transaksi`, `nominal`, `tanggal_transaksi`, `dompet_id`, `kategori_id`, `source_label` (server-assigned)
- Mock: `apps/web/mocks/transactions.json`
- Purpose: Savings target with SAW-computed priority rank
- Fields: `id_goal`, `nominal_target`, `nominal_terkumpul`, `deadline`, `skor_keinginan`, `skor_kepentingan`, `progress_pct`, `rank`
- Mock: `apps/web/mocks/goals.json`
- Purpose: Classifies transactions; determines `source_label` server-side via `flag_pemasukan`
- Read-only for MVP — seeded from research data
- Endpoint: `GET /api/categories`
- Purpose: Named money container (e.g., Gopay, Cash) with balance
- CRUD: `GET/POST/PUT/DELETE /api/wallets`
- Purpose: Smart suggestion for distributing Side Income across goals
- Mock: `apps/web/mocks/allocation-suggestion.json`
- Never auto-executed — always shown as modal for user confirmation

## Entry Points

- Location: `apps/web/app/layout.tsx` — root layout with global fonts and body wrapper
- Location: `apps/web/app/page.tsx` — root page (scaffold, Next.js default)
- Triggers: Browser navigation or Tauri WebView load
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

### Auto-executing Smart Allocation

### Bypassing the API contract

## Error Handling

- All error responses use `{ "error": { "code": "...", "message": "..." } }` shape
- Account lockout returns HTTP 423 with code `ACCOUNT_LOCKED`
- Frontend should check HTTP status code first, then parse `error.code` for user-facing messages

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
