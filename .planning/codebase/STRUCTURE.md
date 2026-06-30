# Codebase Structure

**Analysis Date:** 2026-06-30

## Directory Layout

```
macost/                         # Monorepo root
├── apps/
│   ├── web/                    # Next.js 16 frontend (TypeScript, Tailwind, App Router)
│   │   ├── app/                # App Router pages and layouts
│   │   │   ├── layout.tsx      # Root layout (fonts, body wrapper)
│   │   │   ├── page.tsx        # Root page (scaffold)
│   │   │   └── globals.css     # Global styles
│   │   ├── mocks/              # Static JSON fixtures for frontend dev
│   │   │   ├── dashboard.json
│   │   │   ├── goals.json
│   │   │   ├── transactions.json
│   │   │   └── allocation-suggestion.json
│   │   ├── public/             # Static assets (SVGs, icons)
│   │   ├── next.config.ts      # Next.js configuration
│   │   ├── package.json        # Frontend dependencies
│   │   ├── tsconfig.json       # TypeScript config
│   │   ├── eslint.config.mjs   # ESLint config
│   │   ├── postcss.config.mjs  # PostCSS / Tailwind pipeline
│   │   ├── AGENTS.md           # Cline agent instructions for web area
│   │   └── CLAUDE.md           # Points to AGENTS.md
│   └── native/                 # Tauri 2.0 wrapper (scaffold — empty)
├── backend/                    # FastAPI backend (Python)
│   ├── main.py                 # FastAPI app entry point
│   └── venv/                   # Python virtual environment (not committed)
├── API_CONTRACT.md             # CANONICAL endpoint definitions — always consult first
├── CLAUDE.md                   # Project-wide Claude Code instructions
├── README.md                   # Project overview
└── docker-compose.yml          # Local dev orchestration (planned)
```

## Directory Purposes

**`apps/web/`:**
- Purpose: Next.js frontend application
- Contains: App Router pages, layouts, components (to be added), styles, mock data, config
- Key files: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/next.config.ts`

**`apps/web/app/`:**
- Purpose: Next.js App Router — all routes and their UI live here
- Contains: Page files (`page.tsx`), layout files (`layout.tsx`), route groups (to be added)
- Note: Folder name = URL segment under App Router convention

**`apps/web/mocks/`:**
- Purpose: Static JSON fixtures matching `API_CONTRACT.md` shapes for use during frontend dev before the backend implements each endpoint
- Contains: `dashboard.json`, `goals.json`, `transactions.json`, `allocation-suggestion.json`
- Note: Replace API calls with real fetch calls once backend endpoint is live; remove mock import

**`apps/native/`:**
- Purpose: Tauri 2.0 project that wraps the Next.js static export as an Android app (fallback: PWA)
- Contains: Tauri config, Rust source (scaffold — currently empty directory)
- Owner: Hidayat

**`backend/`:**
- Purpose: FastAPI Python application — all server-side logic, database access, SAW engine
- Contains: `main.py` (entry point), planned service modules, planned route modules
- Owner: Fertika
- Note: `backend/venv/` is the Python virtual environment — never commit to git

## Key File Locations

**Entry Points:**
- `apps/web/app/layout.tsx`: Next.js root layout — wrap global providers here
- `apps/web/app/page.tsx`: Root route `/` — currently scaffold placeholder
- `backend/main.py`: FastAPI app instantiation and root health check route

**Configuration:**
- `API_CONTRACT.md`: Source of truth for all API shapes — read before touching any endpoint or API call
- `apps/web/next.config.ts`: Next.js config — add `output: 'export'` when preparing Tauri build
- `apps/web/tsconfig.json`: TypeScript compiler options for the web app
- `apps/web/package.json`: Frontend npm dependencies and dev scripts
- `CLAUDE.md`: Project-wide rules for Claude Code agents

**Mock Data (frontend dev):**
- `apps/web/mocks/dashboard.json`: Dashboard stats, trend data, overspending alert
- `apps/web/mocks/goals.json`: Goal list with SAW-ranked entries
- `apps/web/mocks/transactions.json`: Transaction history
- `apps/web/mocks/allocation-suggestion.json`: Smart Allocation modal payload

**Core Logic (planned — not yet created):**
- `backend/services/saw_engine.py`: SAW multi-criteria goal ranking algorithm
- `backend/routers/`: FastAPI route modules per domain (auth, wallets, categories, transactions, goals, allocation)

## Naming Conventions

**Files (frontend):**
- Next.js App Router reserved names: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Components: PascalCase, e.g., `GoalCard.tsx`
- Utilities/hooks: camelCase, e.g., `useGoals.ts`, `formatCurrency.ts`
- Mock data: kebab-case JSON, e.g., `allocation-suggestion.json`

**Files (backend):**
- Python modules: snake_case, e.g., `saw_engine.py`, `transaction_router.py`
- Router files: `{domain}_router.py` pattern (planned)
- Service files: `{domain}_service.py` or descriptive name like `saw_engine.py`

**Directories:**
- App Router segments: kebab-case matching URL slug, e.g., `app/smart-allocation/`
- Backend domain groups: snake_case noun, e.g., `routers/`, `services/`

**API fields (per API_CONTRACT.md):**
- All IDs: string UUIDs, prefixed by entity type: `id_goal`, `id_transaksi`, `id_dompet`
- Money fields: integer (Rupiah, no decimals): `nominal`, `saldo`, `nominal_target`
- Dates: ISO 8601 string: `"2026-06-27"` for date, `"2026-06-27T10:00:00Z"` for datetime
- Indonesian field names used throughout (e.g., `nama_goal`, `tipe_transaksi`, `catatan`)

## Where to Add New Code

**New frontend page (route):**
- Create folder matching URL segment under `apps/web/app/`, add `page.tsx` inside
- Example: goals list page → `apps/web/app/goals/page.tsx`
- Add layout if route group needs shared chrome: `apps/web/app/goals/layout.tsx`
- Branch: `frontend/goals` (Khayyira) or `frontend/home` (Zarra)

**New frontend component:**
- Create `apps/web/components/` directory (does not yet exist — create it)
- Place shared components at `apps/web/components/{ComponentName}.tsx`
- Place feature-scoped components at `apps/web/components/{feature}/{ComponentName}.tsx`

**New backend endpoint:**
- Add route to appropriate router file in `backend/routers/` (create directory if first router)
- Register router in `backend/main.py` with `app.include_router()`
- Update `API_CONTRACT.md` first and communicate to team before implementing
- Branch: `backend/...` (Fertika)

**New mock data file:**
- Add JSON to `apps/web/mocks/` matching the response shape from `API_CONTRACT.md`
- Use kebab-case filename matching the domain: `apps/web/mocks/{domain}.json`

**Utilities (frontend):**
- Create `apps/web/lib/` directory (does not yet exist)
- Shared helpers: `apps/web/lib/{name}.ts`
- API client helpers: `apps/web/lib/api.ts`

**Backend services:**
- Place in `backend/services/{service_name}.py`
- `backend/services/saw_engine.py` is the first planned service (SAW goal ranking)

## Special Directories

**`apps/web/mocks/`:**
- Purpose: Static JSON API response fixtures for frontend-only development
- Generated: No — hand-authored to match `API_CONTRACT.md`
- Committed: Yes

**`apps/web/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`backend/venv/`:**
- Purpose: Python virtual environment for backend dependencies
- Generated: Yes (via `python -m venv venv`)
- Committed: No

**`.claude/`:**
- Purpose: Claude Code configuration, GSD workflow commands, hooks
- Generated: Partially (GSD tooling)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts — milestone plans, phase plans, codebase maps
- Generated: By GSD commands
- Committed: Yes

---

*Structure analysis: 2026-06-30*
