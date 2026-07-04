---
quick_id: 260704-pju
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/app/page.tsx
autonomous: true

must_haves:
  truths:
    - "Visiting '/' with a valid stored session token redirects to /wallets instead of forcing the user to log in again"
    - "Visiting '/' with no stored session token still redirects to /login (existing correct behavior preserved)"
    - "No flash of blank/empty content while the token check is in flight — a loading state renders immediately, matching the visual convention already used in wallets/page.tsx"
    - "The static export build (output: 'export', required for the Tauri desktop wrapper) still succeeds after converting page.tsx into a Client Component"
  artifacts:
    - path: apps/web/app/page.tsx
      provides: "Client Component ('use client') that checks getToken() from lib/auth/session in a useEffect and routes to /wallets (token present) or /login (token absent), rendering a loading state while the check is in flight"
  key_links:
    - from: "apps/web/app/page.tsx"
      to: "apps/web/lib/auth/session.ts"
      via: "getToken() import and call inside useEffect"
      pattern: "getToken\\("
    - from: "apps/web/app/page.tsx"
      to: "apps/web/app/wallets/page.tsx"
      via: "router.push('/wallets') when token is truthy"
      pattern: "wallets"
---

<objective>
Convert `apps/web/app/page.tsx` from an unconditional Server Component redirect to `/login` into a Client Component that first checks for an existing session token, then routes accordingly — fixing the live bug where Tauri desktop users with a valid, correctly-persisted token were still forced back to the login screen every time they reopened the app.

Purpose: A prior quick task (260704-h5i) scoped the root page to an unconditional redirect because no dashboard route existed yet. That scope-limiting decision is now the root cause of a confirmed bug: the root page never checks localStorage/Tauri store for a session token before sending the user to `/login`, even though `wallets/page.tsx` (the closest thing to a dashboard today) already has the logic to detect and use that token. This task brings `page.tsx` in line with the same truthy/falsy token-presence check `wallets/page.tsx` already performs, so a returning user with a live session lands on `/wallets` instead of re-authenticating.
Output: `apps/web/app/page.tsx` rewritten as a Client Component that calls `getToken()` in a `useEffect`, pushes to `/wallets` or `/login` based on presence, and renders a loading state (no flash of empty content) while the check is in flight.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current file being replaced (unconditional Server Component redirect — the bug)
@apps/web/app/page.tsx

# Reference pattern to mirror: Client Component, useEffect calling getToken(), presence-only check,
# router.push based on result, loading-state visual convention (bg-[#1e1e1e], centered, muted
# text-[#fcfcfc]/60, Helvetica font family)
@apps/web/app/wallets/page.tsx

# getToken() — async, safe to call client-side; returns string | null; already handles both
# Tauri store and localStorage backends transparently
@apps/web/lib/auth/session.ts

# Confirms output: 'export' is active — Client Components are fully supported in static export
# (login/page.tsx and wallets/page.tsx already prove this pattern works for this project)
@apps/web/next.config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make root page check session token before redirecting</name>
  <files>apps/web/app/page.tsx</files>
  <action>
Rewrite apps/web/app/page.tsx completely, replacing the unconditional Server Component redirect with a Client Component that checks for an existing session token first.

Add `'use client'` as the first line. Remove the `import { redirect } from "next/navigation"` line. Import `useEffect` from `react`, `useRouter` from `next/navigation`, and `getToken` from `@/lib/auth/session` (same import path and function `wallets/page.tsx` already uses).

Inside the default-exported `Home` component: call `useRouter()` to get `router`. Add a `useEffect` with `[router]` in its dependency array that defines and immediately invokes an async `init()` function — mirror the exact structure of `wallets/page.tsx`'s own `init()` inside its `useEffect`: call `const token = await getToken()`, then branch purely on truthy/falsy presence (no backend call to validate expiry or make any other network request) — if `token` is truthy, `router.push('/wallets')`; if falsy (null), `router.push('/login')`.

While this check is in flight, the component must render a loading state so there is no flash of empty content — match the exact visual convention already used in wallets/page.tsx's own loading branch: outer wrapper `bg-[#1e1e1e] min-h-screen flex items-center justify-center`, inner text `text-[#fcfcfc]/60 text-sm` with inline `style={{ fontFamily: 'Helvetica, sans-serif' }}`. Since this component has nothing else to render once routing kicks in (it never shows wallet data or any other content), render this loading markup unconditionally as the component's return value — there is no separate `loading` state variable needed here since the effect always results in a navigation away from this route.

Do not add any call to the backend to check token validity/expiry — that is explicitly out of scope; an expired token will naturally produce a 401 once wallets/page.tsx attempts to load data, which is handled elsewhere.

Do not modify wallets/page.tsx, login/page.tsx (or any file under the (auth) route group), or lib/auth/session.ts — scope is exactly apps/web/app/page.tsx.
  </action>
  <verify>
    <automated>cd apps/web && head -1 app/page.tsx | grep -q "use client" && grep -q "getToken" app/page.tsx && grep -q "useEffect" app/page.tsx && grep -q "'/wallets'" app/page.tsx && grep -q "'/login'" app/page.tsx && npm run lint && npm run build && test -f out/index.html && grep -qi "bg-\[#1e1e1e\]" out/index.html && echo ROOT_SESSION_CHECK_OK</automated>
  </verify>
  <done>apps/web/app/page.tsx is a Client Component that imports and calls getToken() from @/lib/auth/session inside a useEffect, routes to /wallets when a token is present and /login when it is not, and renders the wallets/page.tsx-style loading state (bg-[#1e1e1e], centered, muted Helvetica text) while the check runs. `npm run lint` and `npm run build` both succeed, and the static export at apps/web/out/index.html contains the loading-state markup (confirming the route still produces a valid static page under output: 'export').</done>
</task>

</tasks>

<verification>
- [ ] apps/web/app/page.tsx starts with 'use client' and no longer imports redirect from next/navigation
- [ ] apps/web/app/page.tsx imports getToken from @/lib/auth/session and calls it inside a useEffect
- [ ] Truthy token -> router.push('/wallets'); falsy/null token -> router.push('/login')
- [ ] No backend call is made to validate token expiry — presence-only check, matching wallets/page.tsx's init()
- [ ] A loading state renders while the check is in flight, visually matching wallets/page.tsx's loading branch
- [ ] `cd apps/web && npm run lint` exits 0
- [ ] `cd apps/web && npm run build` exits 0 (static export still works for the Tauri wrapper)
- [ ] apps/web/out/index.html exists and reflects the new client-rendered loading shell
- [ ] wallets/page.tsx, login/page.tsx, and lib/auth/session.ts are unmodified
</verification>

<success_criteria>
- A Tauri desktop user who previously logged in (token correctly persisted in the Tauri store/localStorage) and then closes and reopens the app lands on /wallets without being forced to log in again
- A user with no stored token is still sent to /login, unchanged from prior behavior
- No flash of blank content on "/" while the token check runs
- Static export build for the Tauri desktop wrapper is unaffected
</success_criteria>

<output>
Create `.planning/quick/260704-pju-fix-root-page-tsx-cek-session-token-dulu/260704-pju-SUMMARY.md` when done
</output>
