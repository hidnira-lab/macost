---
phase: quick-260704-ogx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/main.py
autonomous: true
requirements: [OPEN-CORS-TAURI-HTTP]
must_haves:
  truths:
    - "Tauri desktop WebView2's fetch requests sent with Origin: http://tauri.localhost receive a CORS-approved response (matching access-control-allow-origin header) from the live Railway backend, the same way Origin: https://tauri.localhost already does"
  artifacts:
    - backend/main.py
  key_links:
    - "CORSMiddleware allow_origins list in backend/main.py -> includes both http://tauri.localhost and https://tauri.localhost (WebView2's observed origin-scheme behavior for tauri.localhost is inconsistent, so both variants must be whitelisted)"
---

<objective>
Add the missing `"http://tauri.localhost"` origin to the FastAPI CORS `allow_origins` list in `backend/main.py`, alongside the already-present `"https://tauri.localhost"`.

Purpose: Root cause confirmed via live debugging (Tauri devtools enabled by quick task `260704-o31`) plus an independent curl-simulated CORS preflight directly against the live Railway backend: the Tauri desktop app's WebView2 process sends `Origin: http://tauri.localhost` (plain HTTP, no TLS) on its fetch requests, but the backend's `allow_origins` list only whitelists the HTTPS variant (`"https://tauri.localhost"`). Curl confirmed `Origin: https://tauri.localhost` gets 200 OK + correct `access-control-allow-origin` header, while `Origin: http://tauri.localhost` gets 400 Bad Request with no CORS header at all — this is exactly the browser-reported CORS block blocking Tauri desktop login. WebView2's origin scheme behavior for `tauri.localhost` can vary, so whitelisting both HTTP and HTTPS variants makes this robust going forward.

Output: `backend/main.py`'s CORS middleware config updated with one new list entry; no other CORS settings (`allow_origin_regex`, `allow_credentials`, `allow_methods`, `allow_headers`) or existing origins touched.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Relevant STATE.md excerpt already absorbed into this plan (Blockers/Concerns, most recent "OPEN, under active investigation" entry):
"Quick task `260704-o31` enabled the `devtools` Cargo feature (temporary, should be reverted once root cause is found) so DevTools can be opened in the release build to inspect the actual Console/Network error — this is the next diagnostic step, not yet done." That diagnostic step has now been completed by the user outside this plan, and the DevTools console + an independent curl preflight both confirmed the CORS origin mismatch described in `<objective>` above. This plan applies the fix; it does not touch the temporary `devtools` Cargo feature flag from `260704-o31` (that revert is tracked separately).

Current file state (read prior to planning), `backend/main.py` full contents, lines 1-36:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth, wallets

app = FastAPI(title="Macost API")

# CORS must be registered before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "https://tauri.localhost",
        "http://localhost",
        "http://localhost:3000",
        "https://macost.vercel.app",
    ],
    allow_origin_regex=r"https://macost.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(wallets.router, prefix="/api")


@app.get("/")
def read_root():
    return {"status": "Macost backend running"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok"}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add http://tauri.localhost to CORS allow_origins</name>
  <files>backend/main.py</files>
  <action>
Open `backend/main.py` and edit the `allow_origins` list literal inside the `CORSMiddleware` call (currently lines 11-17). Insert a new element `"http://tauri.localhost",` immediately after the existing `"https://tauri.localhost",` line, so the two tauri.localhost variants (HTTP and HTTPS) sit adjacent to each other, grouped after the `"tauri://localhost",` custom-scheme entry.

The resulting `allow_origins` list must contain, in order: `"tauri://localhost"`, `"https://tauri.localhost"`, `"http://tauri.localhost"`, `"http://localhost"`, `"http://localhost:3000"`, `"https://macost.vercel.app"`.

Do not remove, reorder, or reformat any of the five existing origins. Do not touch `allow_origin_regex`, `allow_credentials`, `allow_methods`, or `allow_headers` — leave those four lines byte-for-byte unchanged. Do not touch any code outside the `CORSMiddleware` call (imports, router includes, `read_root`, `health_check`). This is a single-line addition to an existing Python list literal.
  </action>
  <verify>
    <automated>grep -qF '"http://tauri.localhost",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF '"https://tauri.localhost",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF '"tauri://localhost",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF '"http://localhost",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF '"http://localhost:3000",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF '"https://macost.vercel.app",' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF 'allow_origin_regex=r"https://macost.*\.vercel\.app"' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF 'allow_credentials=True' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF 'allow_methods=["*"]' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && grep -qF 'allow_headers=["*"]' "D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py" && python -c "import ast,sys; ast.parse(open('D:/COLLEGE/UII S4/ZEPHYRA/CODE/macost/backend/main.py').read())" && echo PASS</automated>
  </verify>
  <done>`backend/main.py`'s `allow_origins` list contains both `"http://tauri.localhost"` and `"https://tauri.localhost"` (plus all four pre-existing origins, unchanged), `allow_origin_regex`/`allow_credentials`/`allow_methods`/`allow_headers` are untouched, and the file remains valid Python (parses with `ast.parse`).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser/WebView origin -> FastAPI backend | CORS `allow_origins` governs which origins may make credentialed cross-origin requests to the API |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick260704ogx-01 | Spoofing | `backend/main.py` CORS `allow_origins` | low | accept | `http://tauri.localhost` is a fixed, non-routable WebView2-internal virtual host used only by the packaged Tauri desktop app itself (not a public/attacker-reachable network origin); it carries the same trust level as the already-whitelisted `https://tauri.localhost` and `tauri://localhost` entries, so adding the HTTP variant does not admit any new class of caller |
</threat_model>

<verification>
1. Run the Task 1 automated verify command — confirms all six origins present (including the new `http://tauri.localhost`), the CORS regex/credentials/methods/headers lines are unchanged, and the file still parses as valid Python.
2. Manual (post-deploy) spot-check: after this fix ships to Railway, re-run the curl-simulated preflight with `Origin: http://tauri.localhost` against `https://macost-production.up.railway.app` and confirm it now returns 200 with a matching `access-control-allow-origin` header (previously 400 with no CORS header).
</verification>

<success_criteria>
- `backend/main.py`'s CORS `allow_origins` list includes both `"http://tauri.localhost"` and `"https://tauri.localhost"`.
- No other CORS settings or unrelated code changed.
- File is valid Python and the FastAPI app still imports/starts cleanly.
</success_criteria>

<output>
Create `.planning/quick/260704-ogx-fix-cors-backend-tambahkan-http-tauri-lo/260704-ogx-SUMMARY.md` when done
</output>
