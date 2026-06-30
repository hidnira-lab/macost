# Coding Conventions

**Analysis Date:** 2026-06-30

> Note: The codebase is in early scaffold stage. Conventions below reflect established patterns from the existing files and the API contract. Sections marked "Prescribed" are team decisions derived from `API_CONTRACT.md` and `CLAUDE.md` that must be followed even where implementation is sparse.

## Naming Patterns

**Files:**
- React component files: PascalCase with `.tsx` extension — e.g., `layout.tsx`, `page.tsx`
- Config files: kebab-case — e.g., `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- Mock data files: kebab-case with `.json` extension — e.g., `allocation-suggestion.json`, `dashboard.json`
- Python files: snake_case — e.g., `main.py`, `saw_engine.py` (per CLAUDE.md reference)

**Functions/Components:**
- React components: PascalCase — e.g., `Home`, `RootLayout`
- Python functions: snake_case — e.g., `read_root`
- Next.js page exports must use `default export function <ComponentName>` pattern

**Variables:**
- TypeScript/JS: camelCase — e.g., `geistSans`, `geistMono`
- Python: snake_case

**Types/Interfaces:**
- TypeScript types: PascalCase — e.g., `Metadata`, `NextConfig`
- Import types explicitly with `import type` — e.g., `import type { Metadata } from "next"`

**API Fields (Prescribed — from `API_CONTRACT.md`):**
- All IDs: string UUID format — e.g., `id_pengguna`, `id_goal`, `id_transaksi`
- All money amounts: `number` (integer, Rupiah, no decimals)
- All dates: ISO 8601 string — `"2026-06-27"` for dates, `"2026-06-27T10:00:00Z"` for datetimes
- Indonesian field names for domain entities — e.g., `nama_goal`, `nominal_target`, `tipe_transaksi`
- English field names for meta/technical fields — e.g., `rank`, `progress_pct`, `has_active_goal`

## Code Style

**Formatting:**
- No Prettier config detected — formatting deferred to ESLint
- TypeScript strict mode enabled (`"strict": true` in `apps/web/tsconfig.json`)
- Target: ES2017

**Linting (Frontend):**
- ESLint 9 with flat config (`apps/web/eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run: `npm run lint` from `apps/web/`

**Python (Backend):**
- No linting config detected in `backend/` — FastAPI scaffold only
- Prescribed: follow PEP 8 (snake_case, 4-space indent)

## Import Organization

**TypeScript/Next.js order (from `layout.tsx` pattern):**
1. External library types (`import type { ... } from "..."`)
2. External library values (`import { ... } from "..."`)
3. Local files (`import "./globals.css"`)

**Path Aliases:**
- `@/*` maps to `./` (repo root of `apps/web/`) — configured in `apps/web/tsconfig.json`
- Use `@/` prefix for all local imports — e.g., `@/components/Button`

## Error Handling (Prescribed — from `API_CONTRACT.md`)

**API error response shape (all endpoints must return this on failure):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message in Indonesian"
  }
}
```

**Known error codes:**
- `VALIDATION_ERROR` — invalid request body
- `ACCOUNT_LOCKED` — too many failed login attempts (returns HTTP 423)

**Backend (FastAPI):**
- Use HTTP status codes correctly: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 423 Locked
- Return structured error bodies, not plain strings

**Frontend:**
- Handle `allocation_suggestion_available: true` signal from `POST /api/transactions` response to trigger allocation modal
- Handle `has_active_goal: false` from allocation suggestion endpoint to show "Buat goal dulu" prompt
- Handle `insight_available: false` to show `fallback_message` instead

## Business Logic Constraints (Prescribed)

**Source labeling (`flag_pemasukan`):**
- Never send `source` from frontend — server determines it from `kategori_id`'s `flag_pemasukan` field
- Frontend sends only `kategori_id`; backend resolves label automatically

**Smart Allocation:**
- Always suggest-then-confirm; never auto-execute
- SAW algorithm lives in `backend/services/saw_engine.py`
- 5 criteria weights: `personal_importance` (22.5%), `progress_gap` (21.9%), `saving_capacity` (21.5%), `urgency` (17.8%), `target_amount` (16.2%)

**Goal weights validation:**
- Sum of all weights in `PUT /api/goal-settings` must equal exactly 1.0

## Logging

**Backend:** Not yet established — FastAPI default console logging
**Frontend:** Not yet established — no logger configured

## Comments

**API Contract:** All new endpoints must be documented in `API_CONTRACT.md` before implementation. Changes require team-wide notification (Hidayat, Fertika, Khayyira, Zarra).

**Code comments:** No explicit guidelines established yet. Use inline comments for non-obvious business logic (especially SAW algorithm steps).

## Module Design

**Frontend:**
- Next.js App Router conventions: `app/page.tsx` for route pages, `app/layout.tsx` for layout wrappers
- `export default` for page components, named exports for utilities
- No barrel files detected yet

**Backend:**
- FastAPI app instance created once in `backend/main.py` as `app = FastAPI(...)`
- Services go in `backend/services/` (e.g., `saw_engine.py`)

## Mock Data

**Location:** `apps/web/mocks/` — JSON files mirroring API response shapes exactly
**Files:**
- `apps/web/mocks/dashboard.json` — mirrors `GET /api/dashboard` response
- `apps/web/mocks/goals.json` — mirrors `GET /api/goals` response
- `apps/web/mocks/transactions.json` — mirrors `GET /api/transactions` response
- `apps/web/mocks/allocation-suggestion.json` — mirrors `GET /api/transactions/{id}/allocation-suggestion` response

**Rule:** Mock JSON structure must exactly match `API_CONTRACT.md` response shapes. Deviation is a bug.

---

*Convention analysis: 2026-06-30*
