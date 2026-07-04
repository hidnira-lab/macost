---
quick_id: 260704-ili
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/lib/api/types.ts
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(auth)/register/page.tsx
autonomous: true

must_haves:
  truths:
    - "When apiMutate throws the structured backend error shape (error.code + error.message, both strings — the real non-2xx response body from FastAPI per API_CONTRACT.md), the login page shows err.error.message, with the existing special case: code ACCOUNT_LOCKED still shows 'Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.'"
    - "When the caught value does NOT have that structured shape (e.g. a raw TypeError thrown directly by fetch() on network failure, dead host, invalid URL, CORS, or DNS issues — never reaching the backend), the login page shows an honest connection-error message and never the credentials-blaming fallback"
    - "Register page mirrors the same distinction: structured error -> err.error.message; unstructured error -> an honest connection-error message that does not imply the submitted registration data was invalid"
    - "The structural check (error.code and error.message both present as strings) lives in exactly one shared place instead of being duplicated ad hoc in both page files"
    - "No regression: valid login credentials still redirect to /wallets; valid registration still redirects to /wallets; ACCOUNT_LOCKED still renders its specific message"
  artifacts:
    - path: apps/web/lib/api/types.ts
      provides: "isApiErrorBody(value: unknown): value is ApiErrorBody — exported type guard placed alongside the existing ApiErrorBody interface, checking that value.error.code and value.error.message are both strings"
    - path: apps/web/app/(auth)/login/page.tsx
      provides: "handleSubmit's catch block branches on isApiErrorBody(err) before choosing which message to render"
    - path: apps/web/app/(auth)/register/page.tsx
      provides: "handleSubmit's catch block branches on isApiErrorBody(err) before choosing which message to render"
  key_links:
    - from: "apps/web/app/(auth)/login/page.tsx catch block"
      to: "apps/web/lib/api/types.ts isApiErrorBody"
      via: "import { isApiErrorBody } from '@/lib/api/types'"
      pattern: "isApiErrorBody\\("
    - from: "apps/web/app/(auth)/register/page.tsx catch block"
      to: "apps/web/lib/api/types.ts isApiErrorBody"
      via: "import { isApiErrorBody } from '@/lib/api/types'"
      pattern: "isApiErrorBody\\("
---

<objective>
Fix the login and register pages so their catch blocks can tell a real structured backend error apart from a raw network/unexpected failure, and stop rendering every failure as if it were a credentials/validation problem.

Purpose: A live production incident (Vercel's NEXT_PUBLIC_API_BASE_URL pointing at a dead backend URL) caused every login/register fetch() call to throw a raw network error, not the backend's `{error:{code,message}}` shape. Both catch blocks currently do `apiErr?.error?.message ?? '<generic auth-sounding fallback>'`, so a total connectivity/config failure rendered as "Email atau password salah" (login) or "Registrasi gagal" (register) — actively misleading users (and this session's debugging) into suspecting the wrong root cause.
Output: A shared `isApiErrorBody` type guard in `apps/web/lib/api/types.ts`, and both catch blocks rewritten to branch on it — structured errors keep today's exact behavior (including login's ACCOUNT_LOCKED special case), unstructured errors get an honest connection-error message instead of a credentials/validation-sounding fallback.
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# The bug: blind apiErr?.error?.message ?? '<fallback>' in both catch blocks
@apps/web/app/(auth)/login/page.tsx
@apps/web/app/(auth)/register/page.tsx

# ApiErrorBody interface lives here — isApiErrorBody guard goes alongside it
@apps/web/lib/api/types.ts

# What apiMutate actually throws: either the parsed structured error body
# (errorBody, on non-ok HTTP response) or lets a raw fetch() exception
# (e.g. TypeError on network failure) propagate completely uncaught/unparsed
@apps/web/lib/api/client.ts

# Confirms the structured error shape is `{ error: { code, message } }` — the
# same shape isApiErrorBody must check for
@API_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add isApiErrorBody guard and use it in both auth catch blocks</name>
  <files>apps/web/lib/api/types.ts, apps/web/app/(auth)/login/page.tsx, apps/web/app/(auth)/register/page.tsx</files>
  <action>
In apps/web/lib/api/types.ts, add an exported function `isApiErrorBody(value: unknown): value is ApiErrorBody` directly below the existing `ApiErrorBody` interface at the end of the file. Implement it defensively without assuming the input is an object: return false when `value` is not a non-null object; otherwise read its `error` property, return false when that is not a non-null object either; otherwise read `code` and `message` off of it and return true only when both are `typeof === "string"`. This mirrors exactly what apiMutate/apiFetch throw on a real non-ok HTTP response (the parsed `{error:{code,message}}` body from client.ts) versus what a raw fetch() failure throws (a plain Error/TypeError with no `error` property at all).

In apps/web/app/(auth)/login/page.tsx: change the type-only import on line 8 from importing `ApiErrorBody` to instead import the value `isApiErrorBody` from '@/lib/api/types' (keep `LoginResponse` as a type import). Rewrite the catch block's body: replace the `const apiErr = err as ApiErrorBody` cast entirely. Branch first on `isApiErrorBody(err)`. When true, keep today's exact nested behavior unchanged — `err.error.code === 'ACCOUNT_LOCKED'` still sets 'Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.', any other structured error sets `err.error.message` directly (no `??` fallback needed since the guard already proved message is a string). When `isApiErrorBody(err)` is false, set an honest, distinct message describing a connection problem — do not reuse or reference the old credentials-sounding wording, and do not imply the entered email/password were wrong.

In apps/web/app/(auth)/register/page.tsx: same import change (drop the `ApiErrorBody` type import, add the `isApiErrorBody` value import from '@/lib/api/types', keep `RegisterResponse` as a type import). Rewrite the catch block: branch on `isApiErrorBody(err)`. When true, set `err.error.message` directly. When false, set an honest connection-error message adapted to the registration context — it must communicate a connectivity/system problem, and must NOT imply the submitted nama/email/password were invalid or already taken.

Do not touch apiMutate, apiFetch, or any other file. Do not add retry logic. Do not change the `finally { setLoading(false) }` blocks, the JSX, or any other page.
  </action>
  <verify>
    <automated>cd apps/web && grep -q "export function isApiErrorBody" lib/api/types.ts && grep -q "isApiErrorBody(err)" "app/(auth)/login/page.tsx" && grep -q "isApiErrorBody(err)" "app/(auth)/register/page.tsx" && grep -q "ACCOUNT_LOCKED" "app/(auth)/login/page.tsx" && ! grep -q "ApiErrorBody" "app/(auth)/login/page.tsx" && ! grep -q "ApiErrorBody" "app/(auth)/register/page.tsx" && npm run lint && npm run build && echo ERROR_HANDLING_FIX_OK</automated>
  </verify>
  <done>
isApiErrorBody is exported from apps/web/lib/api/types.ts and correctly narrows unknown to ApiErrorBody by checking error.code and error.message are both strings. Both login and register catch blocks call isApiErrorBody(err) before deciding what message to show: structured errors render exactly as before (login's ACCOUNT_LOCKED case included), and non-structured errors (raw fetch/network exceptions) render an honest connection-error message on both pages instead of the old credentials/validation-sounding fallback. Neither page file references the ApiErrorBody type directly anymore (the manual `as ApiErrorBody` cast is gone). npm run lint and npm run build both exit 0.
  </done>
</task>

</tasks>

<verification>
- [ ] apps/web/lib/api/types.ts exports isApiErrorBody(value: unknown): value is ApiErrorBody
- [ ] Login catch block branches on isApiErrorBody(err); ACCOUNT_LOCKED special case still renders unchanged
- [ ] Login catch block's non-structured-error branch shows an honest connection-error message, not a credentials-sounding one
- [ ] Register catch block branches on isApiErrorBody(err); structured errors render err.error.message
- [ ] Register catch block's non-structured-error branch shows an honest connection-error message, not a data-invalid-sounding one
- [ ] Neither page file still imports or casts to ApiErrorBody directly
- [ ] `cd apps/web && npm run lint` exits 0
- [ ] `cd apps/web && npm run build` exits 0
</verification>

<success_criteria>
- A dead/misconfigured NEXT_PUBLIC_API_BASE_URL (or any raw network failure) on login or register now renders an honest connection-error message instead of a credentials/validation-sounding fallback
- Real structured backend errors (wrong password, ACCOUNT_LOCKED, validation errors, email already registered, etc.) render exactly as they did before this fix
- The structural check for "is this actually the backend's error shape" exists in exactly one place (apps/web/lib/api/types.ts), not duplicated in both page files
- No other files, retry logic, or behavior were touched
</success_criteria>

<output>
Create `.planning/quick/260704-ili-perbaiki-error-handling-menyesatkan-di-l/260704-ili-SUMMARY.md` when done
</output>
