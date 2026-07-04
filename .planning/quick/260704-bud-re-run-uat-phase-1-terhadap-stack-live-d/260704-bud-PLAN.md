---
quick_id: 260704-bud
status: complete
---

# Quick Task 260704-bud: Re-run UAT Phase 1 terhadap stack live dan update dokumentasi mobile post-MVP

## Task 1: Re-run 8 UAT items against live stack

- Test `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/wallets` (no token / invalid token) directly against `https://macost-production.up.railway.app` via curl.
- Get manual confirmation from user for: (a) live browser register attempt on `https://macost.vercel.app`, (b) Tauri desktop app relaunch.
- Update `.planning/phases/01-foundation/01-UAT.md` with per-item results — no auto-pass, blocked items documented with concrete reason and impact.
- Update `.planning/STATE.md` Blockers/Concerns with the new backend defect found.

## Task 2: Document Android/PWA as post-MVP

- Update `.planning/PROJECT.md` (Constraints, Out of Scope, Key Decisions) — Android post-MVP, PWA fallback also post-MVP (final).
- Update `.planning/ROADMAP.md` Phase 999.1 section — explicit post-MVP status header, PWA note.
- Update root `CLAUDE.md` and `.claude/CLAUDE.md` — MVP platform target line, all Android/PWA mentions in Tech Stack, Platform Requirements, Component Responsibilities, Layers sections.
- Update `.planning/codebase/{STACK,ARCHITECTURE,STRUCTURE,INTEGRATIONS}.md` (source docs `.claude/CLAUDE.md` syncs from) for consistency.
- Check `API_CONTRACT.md` for mobile-first/360px assumptions (none found) and `context/Macost_PRD.md` (found NFR-09 and VIII.II) — added clarifying notes that the 360px-1440px responsive range still applies to web, just not for Android APK purposes.
