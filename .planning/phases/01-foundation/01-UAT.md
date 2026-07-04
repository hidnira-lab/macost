---
status: partial
phase: 01-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, quick-260704-bud]
started: 2026-07-02T13:00:00.000Z
updated: 2026-07-04T01:40:00.000Z
---

## Current Test

[re-run 2026-07-04 against live stack — frontend https://macost.vercel.app, backend https://macost-production.up.railway.app. Previous blocker (missing Docker/env/deploy config) is resolved: both services are live. A NEW blocker was found at the backend auth layer — see Gaps. 2/8 pass, 0/8 issues (code-side), 6/8 blocked by the new backend defect.]

## Tests

### 1. Desktop app launches and renders
expected: Running the Tauri desktop build opens a window that renders the app's auth screen, not a blank window.
result: pass
source: manual (user-confirmed, 2026-07-04) — re-verified after Phase 01.1, still opens to auth screen.

### 2. Register a new account
expected: Filling name, email, and password on the register page and submitting creates an account and lands the user on an authenticated screen (or redirects to login with a success indicator).
result: blocked
blocked_by: server
reason: "Live backend returns 500 Internal Server Error on POST /api/auth/register. Confirmed via direct curl against https://macost-production.up.railway.app/api/auth/register with a valid payload (reproduced twice, ~0.4s response — an application exception, not a timeout). Validation layer works fine (missing-field payload correctly returns 422), so routing/Pydantic are healthy; the failure is in the Supabase Admin API call itself. Root cause confirmed by user (2026-07-04): the Supabase project's database has not actually been created/provisioned yet — Railway has no real Supabase instance to call, so any Supabase Admin/Auth API call fails. User also reproduced this live in the browser at https://macost.vercel.app: 'muncul registrasi gagal saat tekan button daftar' — confirms the deployed frontend is calling the real backend (USE_MOCK=false in this build) and hitting the same failure."

### 3. Log in and session persists across restart
expected: Logging in with valid credentials succeeds and grants access to protected pages. Closing and reopening the Tauri desktop app keeps the user logged in (no re-login required).
result: blocked
blocked_by: server
reason: "POST /api/auth/login returns 500 Internal Server Error for any credentials (confirmed via curl), same root cause as Test 2 — the Supabase database/project doesn't exist yet, so the Supabase Auth API call fails server-side. Since no account can be created or logged into, session-persistence behavior cannot be exercised."

### 4. Log out and protected routes are blocked
expected: Logging out clears the session; visiting a protected page (e.g., wallets) without a valid session is blocked/redirected, and calling a protected API endpoint without a JWT returns 401.
result: partial
blocked_by: server
reason: "The API-level check passes on its own: GET /api/wallets with no Authorization header correctly returns 401 {\"detail\":\"Not authenticated\"}. However, the full logout flow (establishing a session, logging out, confirming redirect) cannot be exercised end-to-end because login is broken (Test 3). Additionally, GET /api/wallets with an invalid/malformed bearer token returns 500 Internal Server Error instead of 401 — likely the same missing-database root cause (JWT verification path has no exception handling for when Supabase itself is unreachable/nonexistent). Once the Supabase project is provisioned, this specific 500-vs-401 gap should be re-tested — it may need its own code fix (a try/except around JWT verification) even after the database exists."

### 5. Create a wallet
expected: On the wallets page, creating a wallet (e.g., name "GoPay") adds it to the visible wallet list.
result: blocked
blocked_by: server
reason: "Downstream of Test 3 — no valid session can be established to reach the wallets page as an authenticated user."

### 6. Rename a wallet
expected: Editing a wallet's name and saving updates the displayed name.
result: blocked
blocked_by: server
reason: "Same as Test 5 — blocked on login."

### 7. Delete a wallet
expected: Deleting a wallet (after confirming) removes it from the visible wallet list.
result: blocked
blocked_by: server
reason: "Same as Test 5 — blocked on login."

### 8. USE_MOCK toggle switches data source cleanly
expected: Toggling the USE_MOCK env flag switches the frontend between mock JSON data and real backend API calls without requiring any other code changes.
result: blocked
blocked_by: other
reason: "Not independently exercised in this live re-run — toggling NEXT_PUBLIC_USE_MOCK requires a separate rebuild (it's inlined at Next.js build time, apps/web/lib/api/client.ts), which is outside the scope of testing a single live deployment. Code inspection confirms the branch logic is implemented correctly (apiFetch resolves to static mock JSON when USE_MOCK=true, always calls the real API for mutations). The current production build at https://macost.vercel.app is confirmed running with USE_MOCK=false, evidenced by the register failure surfacing the real backend's 500 error in the UI (Test 2) rather than mock success."

## Summary

total: 8
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 7
partial: 1

## Gaps

- **NEW blocker (infra, root cause confirmed by user 2026-07-04): the Supabase database/project has not actually been created/provisioned yet.** This is why `POST /api/auth/register` and `POST /api/auth/login` both return `500 Internal Server Error` on the live Railway deployment — there's no real Supabase instance behind the credentials (or no credentials at all) for the backend to call. Validation (422 on bad payload) works fine, confirming routing/Pydantic are healthy; the failure is specifically in the Supabase Admin/Auth API call. Response time is fast (~0.4s), consistent with an immediate connection/config failure rather than a timeout.
- **NEW blocker (backend, needs re-check once DB exists):** Any protected endpoint call with an invalid/malformed bearer token (`GET /api/wallets` tested) returns `500 Internal Server Error` instead of `401`. The JWT verification path lacks exception handling for invalid tokens — this may resolve once Supabase exists, but should be explicitly re-tested (and likely still needs a try/except around JWT verification regardless).
- **Impact on Phase 2:** This is a setup/provisioning gap, not a code bug in the auth logic itself — the code (register/login/JWT handlers) has never had a real Supabase backend to run against, live or otherwise. Phase 2 (per the team's ownership split, Fertika's area) cannot build or test any endpoint requiring `Authorization: Bearer <token>` until the Supabase project is actually created and its credentials (URL, service role key, anon key) are set in Railway's env vars. **Action item: provision the Supabase project (tables + auth), set credentials in Railway, then re-run this UAT before starting Phase 2.**
- Wallet CRUD endpoints (POST/PUT/DELETE /api/wallets) were not reachable for testing at all — no valid token could be obtained. Once Supabase is provisioned, these need a full re-run.
