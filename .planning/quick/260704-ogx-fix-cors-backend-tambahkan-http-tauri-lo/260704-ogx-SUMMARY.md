---
phase: quick-260704-ogx
plan: 01
subsystem: backend
tags: [cors, fastapi, tauri, bugfix]

requires: []
provides:
  - "backend/main.py CORSMiddleware allow_origins now includes http://tauri.localhost alongside the existing https://tauri.localhost, unblocking Tauri desktop WebView2 login/register requests"
affects: [tauri-desktop-build, auth-login, auth-register, cors]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/main.py

key-decisions:
  - "Added http://tauri.localhost as an additional explicit origin rather than replacing https://tauri.localhost, since WebView2's actual origin scheme for tauri.localhost can vary and both should be whitelisted for robustness"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "backend/main.py allow_origins list contains both http://tauri.localhost and https://tauri.localhost, all other origins and CORS settings (allow_credentials, allow_methods, allow_headers, allow_origin_regex) unchanged"
    verification:
      - kind: unit
        ref: "python -c \"import ast; ast.parse(...)\" -- syntax valid; grep confirms both origin strings present, other entries untouched"
        status: pass
    human_judgment: true
    rationale: "Full end-to-end confirmation (Tauri desktop app successfully logging in against this fix) requires Railway to redeploy this commit first — not yet verified live at SUMMARY time."

duration: 3min
completed: 2026-07-04
status: complete
---

# Quick Task 260704-ogx: Fix CORS to whitelist http://tauri.localhost Summary

**Root cause of the multi-step Tauri desktop login investigation found and fixed: WebView2 sends `Origin: http://tauri.localhost` (HTTP) but the backend's CORS allowlist only had the HTTPS variant — added the missing origin.**

## Performance

- **Duration:** ~3 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `backend/main.py`: added `"http://tauri.localhost"` to `CORSMiddleware`'s `allow_origins` list, right after the existing `"https://tauri.localhost"` entry
- Confirmed via `ast.parse` that the file remains syntactically valid Python
- All other origins (`tauri://localhost`, `http://localhost`, `http://localhost:3000`, `https://macost.vercel.app`) and CORS settings (`allow_credentials`, `allow_methods`, `allow_headers`, `allow_origin_regex`) untouched

## Task Commits

1. **Task 1: Whitelist http://tauri.localhost in CORS** - `4fb3c2a` (fix)

## Files Created/Modified
- `backend/main.py` - `allow_origins` list now includes both `http://tauri.localhost` and `https://tauri.localhost`

## Decisions Made
- Kept the existing `https://tauri.localhost` entry and added the HTTP variant alongside it, rather than replacing it, since which scheme WebView2 actually uses for the `tauri.localhost` origin isn't guaranteed to be consistent across Tauri/WebView2 versions or OS configurations — whitelisting both is the robust choice

## Deviations from Plan
None — single-line addition applied exactly as planned.

## Issues Encountered
None.

## User Setup Required
- **This fix must be deployed to Railway before it takes effect.** Per `CLAUDE.md`/`.claude/CLAUDE.md`, Railway auto-deploys on push to `main` (D-06). This commit is currently on branch `phase-1-foundation-and-environment`, not yet merged/pushed to `main` — until it is, and Railway finishes redeploying, the live backend will still reject `http://tauri.localhost` and the Tauri desktop app will keep showing the connection error.
- Also note: `backend/` is normally Fertika's area of ownership per the team's parallel-development split (CLAUDE.md) — worth a heads-up to her that this file changed.
- Once deployed, retest login from the Tauri desktop release build with `expo.test@macost.dev` / `MacostExpo2026!`.

## Next Phase Readiness
- This is expected to fully resolve the "Tidak dapat terhubung ke server" bug investigated across quick tasks `260704-jd2` (CSP) and `260704-o31` (devtools enable) — final confirmation pending a Railway redeploy and a live retest
- The temporary `devtools` Cargo feature enabled in `260704-o31` should be considered for revert once this fix is confirmed working, since it's not intended to ship long-term in release builds

---
*Phase: quick-260704-ogx*
*Completed: 2026-07-04*

## Self-Check: PASSED
- FOUND: backend/main.py
- FOUND: 4fb3c2a (task commit)
