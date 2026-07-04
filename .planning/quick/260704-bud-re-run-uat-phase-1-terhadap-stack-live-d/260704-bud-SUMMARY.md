---
quick_id: 260704-bud
status: complete
date: 2026-07-04
---

# Summary: Re-run UAT Phase 1 terhadap stack live dan update dokumentasi mobile post-MVP

## Task 1 — UAT re-run result

Re-ran all 8 Phase 1 UAT items against the live stack (Vercel + Railway). Result: 1 pass, 1 partial, 6 blocked — but the blocker changed. It's no longer "missing Docker/env" (Phase 01.1 fixed that); it's a live backend defect:

- `POST /api/auth/register` and `POST /api/auth/login` return `500 Internal Server Error` (confirmed via curl, reproduced twice, ~0.4s response = application exception not a timeout). Validation (422) works fine, so this is a Supabase Admin/Auth API call failure, most likely a Railway env var issue.
- `GET /api/wallets` with an invalid bearer token returns `500` instead of `401` — JWT verification lacks exception handling.
- User confirmed live in-browser: register fails at `https://macost.vercel.app` with the same symptom.
- Desktop app launch (item 1) re-confirmed still passing by user.

Full per-item detail and reasoning: `.planning/phases/01-foundation/01-UAT.md`.

**Recommendation:** Not safe for Phase 2 to build on this Auth foundation yet — Fertika should fix both defects (Railway Supabase env vars; wrap JWT verification in try/except → 401) before Phase 2 endpoints that require `Authorization: Bearer` are exercised end-to-end.

## Task 2 — Android/PWA post-MVP documentation

Updated to reflect the final decision (MVP = Web + Tauri Desktop only; Android and PWA fallback both post-MVP):

- `.planning/PROJECT.md` — Constraints, Out of Scope, Key Decisions
- `.planning/ROADMAP.md` — Phase 999.1 header/status, PWA note
- `CLAUDE.md` (root) — Tech Stack + explicit MVP target line
- `.claude/CLAUDE.md` — Constraints, Frameworks, Platform Requirements, Component Responsibilities, Layers (6 locations)
- `.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `INTEGRATIONS.md` — kept in sync with `.claude/CLAUDE.md` source markers
- `context/Macost_PRD.md` — added clarifying notes to VIII.II (Platform Requirement) and NFR-09 that the 360px–1440px responsive range still applies to web, but is no longer an Android-APK requirement
- `API_CONTRACT.md` — checked, no mobile-first/360px assumptions found, no change needed

## Files modified

- `.planning/phases/01-foundation/01-UAT.md`
- `.planning/STATE.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/INTEGRATIONS.md`
- `context/Macost_PRD.md`
