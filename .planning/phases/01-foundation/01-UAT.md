---
status: partial
phase: 01-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-07-02T13:00:00.000Z
updated: 2026-07-02T13:15:00.000Z
---

## Current Test

[testing paused — 7 items outstanding, blocked on local dev/deployment infra setup (Docker, .env, Vercel/Render/Supabase config)]

## Tests

### 1. Desktop app launches and renders
expected: Running the Tauri desktop build opens a window that renders the app's auth screen, not a blank window.
result: pass
source: automated

### 2. Register a new account
expected: Filling name, email, and password on the register page and submitting creates an account and lands the user on an authenticated screen (or redirects to login with a success indicator).
result: blocked
blocked_by: server
reason: "No docker-compose.yml, no backend/.env, no apps/web/.env — backend has no Supabase credentials to run against. User requested going back to set up Docker, env config, and deployment (Vercel/Render/Supabase) before continuing UAT."

### 3. Log in and session persists across restart
expected: Logging in with valid credentials succeeds and grants access to protected pages. Closing and reopening the Tauri desktop app keeps the user logged in (no re-login required).
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

### 4. Log out and protected routes are blocked
expected: Logging out clears the session; visiting a protected page (e.g., wallets) without a valid session is blocked/redirected, and calling a protected API endpoint without a JWT returns 401.
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

### 5. Create a wallet
expected: On the wallets page, creating a wallet (e.g., name "GoPay") adds it to the visible wallet list.
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

### 6. Rename a wallet
expected: Editing a wallet's name and saving updates the displayed name.
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

### 7. Delete a wallet
expected: Deleting a wallet (after confirming) removes it from the visible wallet list.
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

### 8. USE_MOCK toggle switches data source cleanly
expected: Toggling the USE_MOCK env flag switches the frontend between mock JSON data and real backend API calls without requiring any other code changes.
result: blocked
blocked_by: server
reason: "Same as Test 2 — backend/frontend not runnable without env + Docker setup."

## Summary

total: 8
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 7

## Gaps

[none — blocked items are prerequisite gates, not code defects]
</content>
