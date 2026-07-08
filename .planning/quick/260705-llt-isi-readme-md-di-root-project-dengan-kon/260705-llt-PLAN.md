---
quick_id: 260705-llt
description: Isi README.md di root project dengan konten proper (deskripsi, tech stack, struktur folder, setup dev lokal via docker compose, link dokumen acuan)
date: 2026-07-05
---

## Task 1: Rewrite root README.md with verified project content

<files>
- README.md
</files>

<action>
Replace the current 2-line placeholder content of root `README.md` entirely with a proper project README. Do not touch any other file. Base every claim on the verified codebase state below — do not invent commands, paths, or ports that don't exist in this repo.

Build the file with these sections, in this order:

**1. Title + tagline.** Keep `# macost` as H1 (match existing casing), followed by the existing one-line tagline verbatim: "A pocket MIS helping students turn aimless money into goal-driven savings through smart allocation and AI-powered insights."

**2. `## Tentang Project`** — a short paragraph (Bahasa Indonesia) describing: Macost is a Pocket Management Information System for Indonesian students with mixed income (fixed allowance from parents + side income from freelance/part-time work); helps track transactions, manage savings goals with pixel-art visuals, and get smart allocation suggestions (SAW-based) whenever side income arrives. Note it's a semester-4 PSI academic project, Tim Zephyra, UII, built by 4 people in parallel.

**3. `## Core Value`** — one paragraph: when side income comes in, the system immediately suggests an allocation to the highest-priority goal, always through a suggest-and-confirm flow that never auto-executes, so the user keeps full control over their money.

**4. `## Tech Stack`** — a bullet list, one bullet per layer, citing the actual installed versions found in `apps/web/package.json` and `backend/requirements.txt`:
   - Frontend: Next.js 16 (App Router, TypeScript, Tailwind CSS 4) in `apps/web/` — configured for static export to support the Tauri wrapper
   - Backend: FastAPI (Python 3.12) in `backend/`, served via Uvicorn
   - Database & Auth: Supabase (managed PostgreSQL + Auth, JWT verified via Supabase JWKS)
   - Desktop wrapper: Tauri 2.0 in `apps/native/` — MVP target is Desktop only; Android (Tauri Mobile) is post-MVP
   - Local dev orchestration: Docker Compose (`docker-compose.yml`)

**5. `## Struktur Folder`** — a fenced-free plain text tree (use a markdown code block with the tree, since this is file content, not the `<action>` body) listing exactly these top-level entries, each with a one-line comment, matching the actual repo root: `apps/web/` (Next.js frontend), `apps/native/` (Tauri desktop wrapper), `backend/` (FastAPI backend — routers, services, models, migrations), `docs/` (team technical guide, `PANDUAN_TEKNIKAL_TIM.md`), `context/` (PRD and sitemap reference docs), `.planning/` (GSD planning artifacts — PROJECT.md, ROADMAP.md, phase plans), `docker-compose.yml` (local dev orchestration), `API_CONTRACT.md` (canonical API request/response contract), `CLAUDE.md` (project + AI agent instructions). Do not list `node_modules`, `venv`, `.git`, `.idea`, or other generated/tooling directories.

**6. `## Setup Development Lokal`** — numbered steps, verified against `docker-compose.yml` and `docs/PANDUAN_TEKNIKAL_TIM.md` Section 3:
   1. Prerequisites: Node.js >= 20, Python 3.12, Docker + Docker Compose.
   2. Clone: `git clone https://github.com/hidnira-lab/macost.git` then `cd macost`.
   3. Copy env templates: `cp backend/.env.example backend/.env` and `cp apps/web/.env.example apps/web/.env.local`. Fill in real values (Supabase URL/keys, `AI_VISION_API_KEY` for backend; `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_MOCK` for frontend) — never commit these two files (already gitignored).
   4. Run `docker compose up` from the repo root. This starts two services: `backend` on `http://localhost:8000` (Uvicorn with `--reload`, mounted from `./backend`) and `frontend` on `http://localhost:3000` (`npm run dev`, mounted from `./apps/web`).
   5. Note there is no local Postgres container — Supabase stays hosted-only, dev talks to the real hosted Supabase project.

**7. `## Dokumen Acuan`** — a bullet list of links to: `API_CONTRACT.md` (canonical endpoint contract — must be consulted before changing any request/response shape), `CLAUDE.md` (project conventions and AI agent instructions), `docs/PANDUAN_TEKNIKAL_TIM.md` (team technical onboarding and workflow guide), `.planning/PROJECT.md` (project context, requirements, decisions), `.planning/ROADMAP.md` (phase roadmap), `context/Macost_PRD.md` (full PRD).

**8. `## Deployment`** — short bullet list: Frontend on Vercel (`https://macost.vercel.app`), Backend on Railway (`https://macost-production.up.railway.app`), both auto-deploy on push to `main` (no staging environment, no manual approval step).

**9. `## Tim`** — a small table reproducing the actual work-division table from `CLAUDE.md`: Hidayat (Claude Code, `apps/native`/integrasi/arsitektur), Fertika (Claude Code, `backend/`), Khayyira (Cline, `apps/web` — Goals), Zarra (Cline, `apps/web` — Home/Dashboard). Add a one-line note below the table that each person works on their own branch and opens a PR to `main`.

Keep the whole file in Bahasa Indonesia for section bodies (matching `PROJECT.md`/`CLAUDE.md` conventions) except the H1 title/tagline, which stays as the existing English one-liner. Do not add a License section (none exists in this academic project) and do not fabricate a "Contributing" or "Testing" section since no test framework or contribution process currently exists in the repo.
</action>
<verify>
<automated>test $(wc -l < README.md) -gt 40 && grep -c "API_CONTRACT.md" README.md | grep -qv '^0$' && grep -c "docker compose up" README.md | grep -qv '^0$' && grep -c "apps/native" README.md | grep -qv '^0$' && grep -c "PANDUAN_TEKNIKAL_TIM" README.md | grep -qv '^0$' && echo PASS</automated>
</verify>

<done>
Root `README.md` no longer contains the 2-line placeholder — it has a full project README covering: project description (Tentang Project, Core Value), verified tech stack (Next.js/FastAPI/Supabase/Tauri/Docker Compose matching actual installed versions), an accurate folder structure tree matching the real repo root, step-by-step local dev setup instructions matching `docker-compose.yml` (backend :8000, frontend :3000, env file copy steps), a Dokumen Acuan section linking `API_CONTRACT.md`, `CLAUDE.md`, `docs/PANDUAN_TEKNIKAL_TIM.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `context/Macost_PRD.md`, a Deployment section with the live Vercel/Railway URLs, and a Tim section matching the work-division table in `CLAUDE.md`. No other file was modified.
</done>