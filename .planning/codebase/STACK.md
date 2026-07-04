# Technology Stack

**Analysis Date:** 2026-06-30

## Languages

**Primary:**
- TypeScript 5.x - Frontend (`apps/web/`) — all `.ts` and `.tsx` files
- Python 3.12 - Backend (`backend/`) — all `.py` files

**Secondary:**
- CSS (Tailwind utility classes) - Styling in `apps/web/app/globals.css`

## Runtime

**Environment:**
- Node.js (version not pinned; `apps/web/` uses `"@types/node": "^20"` as minimum)
- Python 3.12 (inferred from `backend/venv/Lib/site-packages/` bytecode `cpython-312`)

**Package Manager:**
- npm — `apps/web/package-lock.json` present
- pip — Python venv at `backend/venv/`
- Lockfile: `apps/web/package-lock.json` (Node); no `requirements.txt` committed (venv only, no pinned lockfile outside venv)

## Frameworks

**Core:**
- Next.js 16.2.9 (`apps/web/`) - App Router, TypeScript, static export target for Tauri wrapper
- React 19.2.4 (`apps/web/`) - UI rendering
- FastAPI 0.138.2 (`backend/`) - REST API server
- Starlette 1.3.1 (`backend/`) - ASGI foundation under FastAPI

**Build/Dev:**
- Tailwind CSS 4.x (`apps/web/`) - Utility-first CSS; configured via `@tailwindcss/postcss`
- ESLint 9.x with `eslint-config-next` 16.2.9 (`apps/web/`) - Linting
- TypeScript strict mode (`apps/web/tsconfig.json` — `"strict": true`)
- Uvicorn 0.49.0 (`backend/`) - ASGI server for FastAPI
- Tauri 2.0 (`apps/native/`) - Desktop wrapper for MVP; Android mobile target is post-MVP (Phase 999.1)

**Testing:**
- Not yet configured (no test framework found in either `apps/web/package.json` or backend venv)

## Key Dependencies

**Critical:**
- `next` 16.2.9 - Full-stack framework; drives routing, SSR/static export for Tauri
- `fastapi` 0.138.2 - All API endpoints defined here; see `API_CONTRACT.md`
- `pydantic` 2.13.4 - Request/response validation in FastAPI models
- `supabase` - PostgreSQL + Auth provider (SDK not yet installed in venv; used via REST/JWT at runtime per `API_CONTRACT.md`)

**Infrastructure:**
- `uvicorn` 0.49.0 - Production ASGI runner for `backend/main.py`
- `python-multipart` 0.0.32 - Form data parsing for FastAPI
- `anyio` 4.14.1 - Async I/O abstraction used by FastAPI/Starlette
- `pydantic-core` 2.46.4 - Rust-based core for Pydantic 2.x

## Configuration

**Environment:**
- No `.env` files committed; environment variables are expected at runtime
- Required vars (from `API_CONTRACT.md`): Supabase URL, Supabase anon/service key, JWT secret
- Backend base URL dev: `http://localhost:8000`; prod: `https://macost-api.onrender.com`

**Build:**
- `apps/web/next.config.ts` - Minimal config (no static export flag set yet; needed before Tauri integration)
- `apps/web/tsconfig.json` - Strict TypeScript; path alias `@/*` maps to repo root of `apps/web/`
- No Docker Compose file found in root (referenced in CLAUDE.md but not yet created)

## Platform Requirements

**Development:**
- Node.js >= 20
- Python 3.12
- npm for frontend dependency management
- Python venv (`backend/venv/`) for backend

**Production:**
- Backend: Render.com (FastAPI via Uvicorn)
- Frontend: Vercel (web, primary MVP target); Tauri 2.0 Desktop build (static Next.js export). Android APK and PWA fallback: post-MVP, not current deploy targets.
- Database: Supabase (managed PostgreSQL)

---

*Stack analysis: 2026-06-30*
