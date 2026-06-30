# Pitfalls Research

**Domain:** Student pocket MIS — Next.js static export + FastAPI + Supabase + Tauri 2.0 (Android)
**Researched:** 2026-06-30
**Confidence:** LOW (web search sources; cross-checked against official docs where available)
**Deadline context:** MVP July 9-10, Expo demo July 14, 2026 — 10 days remaining

---

## Severity Classification

- **SHOW-STOPPER:** Demo breaks completely. Must fix before July 14.
- **DEMO-RISK:** Demo degrades or looks broken. Fix before demo, fallback acceptable.
- **NICE-TO-FIX:** Technical debt or minor UX issue. Acceptable for MVP.

---

## Critical Pitfalls

### Pitfall 1: `next.config.ts` Missing Static Export — Tauri Loads Blank Screen

**Severity:** SHOW-STOPPER

**What goes wrong:**
`apps/web/next.config.ts` is currently empty (`const nextConfig: NextConfig = {}`). Without `output: 'export'` and `images: { unoptimized: true }`, `next build` produces a server-rendered output. Tauri's webview cannot run a Node.js server — it loads from `../out/` (a static file directory). The result is a blank white screen inside the Android APK with no error shown to the user.

**Why it happens:**
The Tauri + Next.js integration requires static generation, but Next.js defaults to server rendering. Developers assume the default build "just works" and only discover the blank screen when they first launch the APK on device.

**How to avoid:**
Apply this configuration on day 1 of Foundation work — before any frontend development:

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};
```

Also set in `apps/native/src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  }
}
```

**Warning signs:**
- `apps/web/next.config.ts` has no `output` field
- Tauri build completes without error but app shows blank screen
- Android logcat shows `ERR_FILE_NOT_FOUND` for the index path

**Phase to address:** Kelompok 1 — Foundation, first task before any UI work begins

---

### Pitfall 2: Server Actions Used Anywhere in the App — Silent Build Failure

**Severity:** SHOW-STOPPER

**What goes wrong:**
Next.js Server Actions (`'use server'`, `useFormState`, `useFormAction`, or form `action={serverFn}`) are completely incompatible with `output: 'export'`. When any page or component uses a Server Action, `next build` fails at export time with an error like `Error: Page "/transactions/new" is missing generateStaticParams() which is required for dynamic routes in static export`. The build produces no `out/` directory, meaning Tauri has nothing to load.

**Why it happens:**
Next.js App Router documentation prominently features Server Actions as the modern mutation pattern. Developers following official tutorials write them naturally. The incompatibility is documented but easy to miss if developers don't check the "unsupported features" section of the static export guide.

**How to avoid:**
Establish a team rule on day 1: **all mutations go through `fetch()` to the FastAPI backend — no Server Actions ever**. Since the backend is already a separate FastAPI service, there is no reason to use Server Actions. Add this to CLAUDE.md:

```
# Rule: No Server Actions
All data mutations must use fetch() calls to FastAPI.
Server Actions are incompatible with output: 'export' (Tauri target).
```

**Warning signs:**
- Any file containing `'use server'` directive
- Form elements with `action={fn}` where `fn` is async
- `import { useFormState } from 'react-dom'`
- Build error mentioning "generateStaticParams" on non-dynamic pages

**Phase to address:** Kelompok 1 — Foundation, documented in CLAUDE.md and enforced in first PR review

---

### Pitfall 3: Dynamic Routes Missing `generateStaticParams()` — Goal/Transaction Detail Pages Break

**Severity:** SHOW-STOPPER

**What goes wrong:**
Pages like `app/goals/[id]/page.tsx` or `app/transactions/[id]/page.tsx` use dynamic route segments. With `output: 'export'`, these routes require `generateStaticParams()` to enumerate all valid IDs at build time. Since goal and transaction IDs are user-generated UUIDs in Supabase, they are unknown at build time — `generateStaticParams()` cannot enumerate them. The build fails or the routes produce empty pages.

**Why it happens:**
Developers create `[id]` folders following standard Next.js patterns without checking static export constraints. The error only surfaces at `next build` time, not during `next dev`.

**How to avoid:**
Use only query-parameter routing or hash routing for detail views, keeping a single static page that reads the ID client-side:

```tsx
// app/goals/page.tsx — single static page
'use client'
import { useSearchParams } from 'next/navigation'

export default function GoalsPage() {
  const params = useSearchParams()
  const selectedId = params.get('id')
  // if selectedId is set, render detail; else render list
}
```

Alternatively, keep detail views as modals/sheets opened on top of list pages — no separate route needed. This also produces better UX on mobile.

**Warning signs:**
- Any folder structure like `app/goals/[id]/` exists in the frontend
- `next build` errors mentioning `dynamicParams` or `generateStaticParams`
- Pages work in `next dev` but fail during build

**Phase to address:** Kelompok 1 — Foundation, establish routing conventions before Khayyira and Zarra begin page work

---

### Pitfall 4: Tauri `apps/native/` Scaffold Not Created — No Integration Testing Until Too Late

**Severity:** SHOW-STOPPER

**What goes wrong:**
`apps/native/` does not exist in the repository. Without the Tauri scaffold, the team cannot test the mobile app at all. Integration issues (asset loading, auth redirect, native plugin compatibility, APK build failures) are only discovered at the last minute, leaving no time to fix them before the July 14 demo.

**Why it happens:**
Hidayat owns the Tauri wrapper but may deprioritize it while others build features, assuming "I'll wire it up at the end." Tauri Android builds have a long cold-start compile time (Rust + Android SDK) and require Android NDK setup. If this is deferred, the first APK build attempt fails for environment reasons, not code reasons.

**How to avoid:**
Scaffold `apps/native/` on day 1 using:
```bash
cd apps && npm create tauri-app@latest -- native --template next-app --manager npm
```
Then immediately do a test build to verify the Android toolchain works. Configure `tauri.conf.json` to point at `../web/out`. Run `tauri android build` once to confirm the pipeline before any features are built.

**Warning signs:**
- `apps/native/` directory still absent after day 2
- No APK has been generated yet by day 5
- Android NDK/SDK not configured on Hidayat's machine

**Phase to address:** Kelompok 1 — Foundation, owned by Hidayat, day 1-2

---

### Pitfall 5: Supabase Auth Session Not Persisting in Tauri WebView

**Severity:** SHOW-STOPPER

**What goes wrong:**
Supabase JS client defaults to storing the session in `localStorage`. In Tauri's Android WebView, `localStorage` may not persist reliably across app restarts (depending on WebView version and Android configuration). Users log in, close the app, reopen it, and find themselves logged out — or worse, the app silently fails to attach the auth token to API calls, returning 401s on every request.

**Why it happens:**
Supabase's browser-native `createClient()` is designed for web browsers where `localStorage` is stable. Tauri WebView wraps Android's system WebView, which may clear storage under memory pressure or across process restarts.

**How to avoid:**
Use a custom storage adapter backed by `tauri-plugin-store` for persistent native key-value storage:

```typescript
// apps/web/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Store } from '@tauri-apps/plugin-store'

const store = new Store('.supabase-session.dat')

const tauriStorageAdapter = {
  getItem: async (key: string) => await store.get(key) ?? null,
  setItem: async (key: string, value: string) => { await store.set(key, value); await store.save() },
  removeItem: async (key: string) => { await store.delete(key); await store.save() },
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: tauriStorageAdapter } }
)
```

Also use PKCE flow (not implicit) for any OAuth: `auth: { flowType: 'pkce' }`.

**Warning signs:**
- Auth works in `next dev` browser but not in APK
- Console shows 401 errors on first API call after app resume
- User sees login screen after reopening the app

**Phase to address:** Kelompok 1 — Foundation, during Tauri scaffold setup

---

### Pitfall 6: FastAPI JWT Middleware — Wrong Algorithm or Missing Audience Check

**Severity:** SHOW-STOPPER

**What goes wrong:**
Two failure modes:
1. Developer uses RS256 (asymmetric) when Supabase actually uses HS256 (symmetric HMAC). The JWT library throws "Algorithm not supported" or silently rejects all tokens, returning 403 on every protected endpoint.
2. Developer forgets to verify the audience claim (`aud: "authenticated"`). This means any valid Supabase JWT — including anonymous keys or service role tokens — can authenticate as a regular user.

**Why it happens:**
Many JWT tutorials use RS256 (asymmetric keys) as the "secure" example. Supabase's JWT secret is a symmetric HMAC-SHA256 key, not a RSA key pair. Developers copy the pattern without checking Supabase's actual algorithm. The audience mistake happens because most JWT decode examples don't show audience verification.

**How to avoid:**
```python
# backend/dependencies/auth.py
import os
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

bearer = HTTPBearer()
SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]

async def get_current_user(token = Depends(bearer)):
    try:
        payload = jwt.decode(
            token.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],          # Supabase uses HS256, not RS256
            audience="authenticated",      # MUST verify audience
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

Apply `Depends(get_current_user)` to all routers except `/api/auth/*`.

**Warning signs:**
- All API calls return 403 or 401 immediately after login
- Backend logs show "Algorithm not supported" or JWT decode errors
- Login endpoint works but any subsequent request fails

**Phase to address:** Kelompok 1 — Foundation, first PR from Fertika (backend)

---

### Pitfall 7: SAW Algorithm Division by Zero on Single Goal or Identical Values

**Severity:** SHOW-STOPPER (core feature; demo cannot proceed without working goal ranking)

**What goes wrong:**
SAW normalization for "benefit" criteria uses `(value - min) / (max - min)`. When there is only one goal, or when all goals have the same value for a criterion, `max - min = 0` — causing division by zero. Python raises `ZeroDivisionError`, crashing `GET /api/goals` with HTTP 500. The entire goals page and allocation suggestion flow become unavailable.

Three specific edge cases:
1. **Empty goals list** — function runs on empty list, returning wrong structure
2. **Single goal** — `max = min`, division by zero on every criterion
3. **All goals tied on one criterion** — same as above but partial

**Why it happens:**
SAW implementations in academic papers always show examples with 3+ alternatives that are different. Edge cases are documented in academic literature but never in tutorial code. The survey-validated weights are robust, but the normalization formula is not.

**How to avoid:**
```python
# backend/services/saw_engine.py
def normalize_criterion(values: list[float], is_benefit: bool) -> list[float]:
    if not values:
        return []
    min_v, max_v = min(values), max(values)
    if max_v == min_v:
        # All values identical — assign equal score to all alternatives
        return [1.0 if is_benefit else 1.0] * len(values)
    if is_benefit:
        return [(v - min_v) / (max_v - min_v) for v in values]
    else:
        return [min_v / v if v != 0 else 1.0 for v in values]

def rank_goals(goals: list) -> list:
    if len(goals) == 0:
        return []
    if len(goals) == 1:
        goals[0].rank = 1
        return goals
    # ... full SAW logic with normalization
```

**Warning signs:**
- `GET /api/goals` returns HTTP 500 when user has 0 or 1 goals
- Backend logs show `ZeroDivisionError` or `NaN` in scoring
- Allocation suggestion crashes for new users (zero goals)

**Phase to address:** Kelompok 2 — Inti Produk, `saw_engine.py` must pass unit tests before any integration

---

### Pitfall 8: SAW Weight Validation Fails Due to Float Precision

**Severity:** DEMO-RISK

**What goes wrong:**
`PUT /api/goal-settings` validates that weights sum to exactly `1.0`. The default survey weights are `0.225 + 0.219 + 0.215 + 0.178 + 0.162 = 0.999` due to IEEE 754 floating point — not `1.0000` exactly. Strict equality check `sum(weights.values()) == 1.0` rejects the default weights, making the settings endpoint return 400 for valid input. This breaks FR-013 (strategy toggle) and FR-014 (custom weights).

**Why it happens:**
Decimal fractions cannot be represented exactly in binary floating point. `0.225` in binary is `0.22499999...` or `0.22500000001...`. Strict equality comparison is documented as problematic but developers write it anyway.

**How to avoid:**
```python
# In PUT /api/goal-settings validation
if abs(sum(weights.values()) - 1.0) > 0.001:
    raise HTTPException(status_code=400, detail="Weights must sum to 1.0 (tolerance ±0.001)")
```

This is already documented in `CONCERNS.md` — ensure the implementation uses tolerance, not equality.

**Warning signs:**
- Default weights rejected by the settings endpoint with HTTP 400
- Frontend shows "error saving settings" when no change was made
- Manual weight adjustment always returns validation error

**Phase to address:** Kelompok 2 — Inti Produk, in `PUT /api/goal-settings` implementation

---

### Pitfall 9: `allocation_suggestion_available` Flag Creates Silent Failure When Missing

**Severity:** DEMO-RISK

**What goes wrong:**
The entire Smart Allocation flow (Macost's core differentiator) is triggered by a single flag in the `POST /api/transactions` response: `allocation_suggestion_available: true`. If the backend implementation omits this field (common during iterative development), the frontend never calls `GET /api/transactions/{id}/allocation-suggestion`, and the allocation modal never appears. To the demo audience, the key feature simply doesn't work — with no visible error.

**Why it happens:**
The field is a "signaling" mechanism that exists only in the response, not as a separate endpoint. Developers implementing the POST handler may return the transaction fields and forget to add the computed flag. Since it defaults to `undefined` (falsy), the frontend silently skips the allocation step.

**How to avoid:**
1. The backend must always include `allocation_suggestion_available` in the POST /api/transactions response — compute it synchronously from the transaction's category `flag_pemasukan`.
2. The frontend must treat a missing field as `false` and surface a "check pending allocations" prompt rather than silently skipping.
3. Add `GET /api/allocations/pending` as a safety net — poll this on app resume to catch any missed triggers.
4. Write an integration test: POST side income → assert response contains `allocation_suggestion_available: true`.

**Warning signs:**
- Adding a Side Income transaction never shows the allocation modal
- No errors in console; the flow just stops after transaction save
- `POST /api/transactions` response body logged, field is absent or null

**Phase to address:** Kelompok 2 — Inti Produk, in POST /api/transactions implementation and frontend integration

---

### Pitfall 10: Render Free Tier Cold Start Kills the Demo

**Severity:** DEMO-RISK

**What goes wrong:**
Render's free tier spins down services after 15 minutes of inactivity. The first request after sleep takes 30–60 seconds to respond. During the July 14 Expo demo, the audience will see a loading spinner for up to a minute on login or the first API call. This makes the app look broken.

**Why it happens:**
Free tier is the natural choice for a student project. The cold start is expected behavior but catches teams off-guard during demos when the service has been idle.

**How to avoid:**
1. **Immediate (free):** Set up [UptimeRobot](https://uptimerobot.com) with a free HTTP monitor pinging `https://macost-api.onrender.com/` every 5 minutes.
2. **Add a `/health` endpoint** to FastAPI that returns `{"status": "ok"}` — UptimeRobot targets this.
3. **Before demo:** Manually hit the API URL 2 minutes before the presentation starts to ensure it's warm.
4. **Alternative:** Upgrade Render to Starter tier ($7/month) for always-on service — worth it for the demo.

**Warning signs:**
- First API call after lunch break takes >5 seconds
- Backend logs show "Starting service" at the time of a request
- Render dashboard shows "Spinning up" status

**Phase to address:** Kelompok 1 — Foundation (set up UptimeRobot immediately after backend deploys), and demo-day checklist

---

### Pitfall 11: API Contract Drift — Mock Data Shape Diverges From Backend Implementation

**Severity:** DEMO-RISK

**What goes wrong:**
`API_CONTRACT.md` is currently marked `v0.1 (draft — needs review)`. Four developers are building in parallel: Khayyira and Zarra build frontend against mock JSON files in `apps/web/mocks/`, while Fertika implements the backend. Research shows ~70% of parallel-team projects experience contract drift where mock data and live API diverge silently. Integration day becomes a debugging marathon.

Specific risks for Macost:
- Mock `goals.json` has `rank: 1` as a number; backend returns it as a string — TypeScript error at runtime
- `source_label` field absent from backend response — frontend shows undefined instead of "Flexible Side Income"
- `allocation_suggestion_available` field not in backend POST response — Smart Allocation never triggers

**Why it happens:**
Without schema validation, there is no automated check that mock JSON matches the API contract. Each developer interprets the contract slightly differently. Small changes made informally (Slack message, verbal agreement) never reach all four people.

**How to avoid:**
1. **Lock the contract first:** Bump `API_CONTRACT.md` to v1.0 with explicit team sign-off before any implementation starts. No backend code until the contract is locked.
2. **Extract TypeScript types from the contract:** Create `apps/web/lib/api/types.ts` with interfaces that exactly mirror the API responses. Mock JSON files must satisfy these types.
3. **Integration day plan:** Schedule a dedicated 2-hour integration session on July 8 (day before MVP). Don't attempt integration at the last minute.
4. **Spot-check key responses:** Before demo, manually verify: POST /api/transactions response shape, GET /api/goals response shape with `rank` field, GET /api/transactions/{id}/allocation-suggestion.

**Warning signs:**
- Mock JSON and API_CONTRACT.md disagree on field names or types
- Team members say "I assumed the field was called X" after contract was written
- Backend returns `null` where frontend expects an empty array `[]`
- TypeScript compiler shows type errors when switching from mock to real API

**Phase to address:** Kelompok 1 — Foundation (lock contract), Kelompok 2 — Inti Produk (integration validation)

---

### Pitfall 12: AI Vision / LLM Provider Not Chosen — FR-002 and FR-012 Are Blocked

**Severity:** DEMO-RISK

**What goes wrong:**
`POST /api/transactions/scan-receipt` and `GET /api/ai-insight` depend on an LLM/vision API that is not identified anywhere in the codebase (`CONCERNS.md` documents this explicitly). No SDK is installed, no API key env vars are named. This means FR-002 (receipt scan) and FR-012 (AI insight) cannot be implemented until a provider is chosen. If this decision is deferred, there is no time to implement, test, and stabilize the AI features before July 14.

**Why it happens:**
Provider selection feels like a "later decision" but it is blocking. Each provider has different SDK patterns, timeout behaviors, response schemas, and rate limits. Changing providers mid-implementation requires rewriting service code.

**How to avoid:**
Decide on day 1 of Kelompok 3 work:
- **Receipt OCR:** Use Google Cloud Vision API (best accuracy for Indonesian receipts) or OpenAI GPT-4o Vision (simpler integration, single SDK). GPT-4o Vision recommended for simplicity.
- **AI Insight:** Use Anthropic Claude Haiku or OpenAI GPT-3.5-turbo (cheap, fast, sufficient for one-directional insights).
- Add provider choice and env var names to CLAUDE.md immediately.
- Implement hard timeouts: 10s for scan-receipt, 15s for ai-insight (per API_CONTRACT.md).
- Always return the `extracted: false` fallback response on any error, never block the user.

**Warning signs:**
- Kelompok 3 begins and no provider is in `.env.example`
- No `requirements.txt` entry for an AI SDK
- `scan-receipt` endpoint raises `ImportError` because no SDK is installed

**Phase to address:** Kelompok 3 — Pelengkap, provider decision must precede implementation

---

### Pitfall 13: Backend `venv/` Committed to Git — CI Fails, Repo Bloated

**Severity:** NICE-TO-FIX (but blocks CI setup if not fixed early)

**What goes wrong:**
`.gitignore` is malformed (contains the literal shell heredoc wrapper `cat > .gitignore << 'EOF'` as the first line). As a result, `backend/venv/` — potentially hundreds of MB of Python packages — is tracked by Git. GitHub repository becomes huge, clones are slow, and CI cannot reliably install dependencies because the committed venv binaries are platform-specific.

**How to avoid:**
Fix immediately:
```bash
# Fix .gitignore (remove heredoc wrapper lines)
# Then untrack the venv:
git rm -r --cached backend/venv/
git commit -m "fix: remove venv from git tracking"
```

Also create `backend/requirements.txt` so any developer can reproduce the environment: `pip freeze > requirements.txt` inside the active venv.

**Warning signs:**
- `git ls-files backend/venv/` returns files
- Repository size > 100MB
- GitHub warns about large files during push

**Phase to address:** Kelompok 1 — Foundation, day 1 housekeeping

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No `lib/api/` abstraction layer (directly import mock JSON) | Faster initial UI dev | Every component needs touching at integration time; no type safety on API responses | Never — create the abstraction layer even if it returns mock data initially |
| SAW ranking without edge case tests | Faster to write | HTTP 500 on every goals request for new users (0 or 1 goals) | Never — unit test the edge cases before integration |
| Hardcoded JWT secret in `.env` without `.env.example` | Works on one machine | Other 3 developers can't run the backend; CI fails silently | Never for team projects |
| Defer Tauri Android build to the last 2 days | More time for features | No time to fix Rust/Android toolchain issues discovered at build time; demo fails | Never for a demo-deadline project |
| Using `next dev` for everything and building APK only at the end | No Tauri overhead during dev | Silent incompatibilities (Server Actions, localStorage, dynamic routes) only discovered at build time | Never — do one Tauri build per week minimum |
| Skipping `CORS` configuration | One less thing to configure | Every API call from Tauri WebView returns CORS error, app is completely non-functional | Never — add CORS on day 1 of backend |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase + FastAPI | Using anon key to verify JWTs | Use the `SUPABASE_JWT_SECRET` from project settings, not the anon or service role key |
| Supabase + Tauri | Default `createClient()` with browser localStorage | Custom storage adapter backed by `tauri-plugin-store` for persistent native storage |
| Next.js + Tauri | `next build` without `output: 'export'` | Always set `output: 'export'` and `images.unoptimized: true` before first build |
| FastAPI + Tauri | No CORS middleware | Add `CORSMiddleware` with Tauri origin (`tauri://localhost` and `http://tauri.localhost`) |
| LLM vision API + FastAPI | No timeout configured, await hangs indefinitely | Wrap all LLM calls in `asyncio.wait_for()` with 10s/15s timeouts; catch `asyncio.TimeoutError` |
| Mock data + TypeScript | Mock JSON files not typed | Define `interface GoalResponse`, `interface TransactionResponse` etc. in `lib/api/types.ts`; assert mock files satisfy these types |
| Supabase Auth + OAuth | Using implicit flow for mobile | Always use PKCE flow (`flowType: 'pkce'`) for Tauri/mobile; implicit flow is insecure for native apps |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| SAW ranking on every `GET /api/goals` | Goals page slow when user has 10+ goals | Cache ranked list in-memory; invalidate on POST/PUT/DELETE goal or PUT goal-settings | Noticeable lag at 5+ goals with complex weights |
| `GET /api/dashboard` without period default | All-time data aggregation query runs on every dashboard load | Always default `period=this_month` in backend; document this in API contract | Not a problem at MVP scale, but query cost grows linearly with transaction count |
| No DB indexes on `transaksi.kategori_id` and `transaksi.dompet_id` | Slow `GET /api/transactions?category_id=X` filter queries | Add indexes on foreign key columns in Supabase migration | Noticeable at 100+ transactions per user |
| Render free tier cold start | First API call after 15min inactivity takes 30-60s | UptimeRobot keep-alive ping every 5 minutes | Every time service is idle during the demo |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| SUPABASE_JWT_SECRET exposed in frontend code | Anyone can forge valid JWTs and authenticate as any user | Keep JWT secret server-side only; frontend uses anon key only |
| No file type/size validation on receipt upload | Malicious file upload; server-side code execution risk; storage abuse | Validate MIME type (`image/jpeg`, `image/png`, `application/pdf`) and max size (10MB) before processing |
| CORS wildcard `allow_origins=["*"]` in production | Cross-origin attacks from any domain | Restrict to Tauri origin + deployed frontend domain in production |
| `skor_kepentingan` formula undocumented | Frontend display shows unexplained scores; SAW ranking may be different from what user expects | Document the exact deadline-to-importance formula in API_CONTRACT.md and CLAUDE.md |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Onboarding asks users to create goals + wallet + set weights before seeing any value | 74% of users never return after day 1 (industry average) | Progressive onboarding: register → add first transaction → see dashboard (3 steps max before first value moment) |
| Allocation modal appears but "Skip" is not prominent | Users who don't want to allocate now feel trapped; violates suggest-and-confirm principle | Make "Skip for now" equally prominent to "Confirm"; honor the skip by routing to pending notifications |
| AI receipt scan fails silently with no manual fallback visible | User loses their transaction data; frustration | Always show manual entry form below the scan button; never block the transaction flow on AI availability |
| Pixel art progress shows no intermediate states (0% → 100% jump) | Users feel no progress during early saving | Ensure pixel art renders meaningful intermediate states at 10%, 25%, 50%, 75% thresholds |
| Dashboard loaded before any transactions exist | Empty state with charts/placeholders looks broken | Implement explicit empty states: "Add your first transaction to see your spending breakdown" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Static export:** `next build` completes without errors AND `out/` directory contains all expected HTML files (index.html, 404.html for each route)
- [ ] **Tauri APK:** App loads on physical Android device (not just emulator) — emulator passes, physical device fails on CSP or asset protocol
- [ ] **Auth persistence:** Close the APK completely, reopen — user should still be logged in without re-entering credentials
- [ ] **SAW ranking:** Create 1 goal, then 2 goals, then edit weights — verify no HTTP 500 at each step
- [ ] **Smart Allocation trigger:** Add a Side Income transaction — verify allocation modal appears within 2 seconds
- [ ] **Allocation skip:** Skip the allocation modal — verify the pending suggestion appears in Notifikasi page
- [ ] **Receipt scan fallback:** Upload a blurry photo — verify `extracted: false` response shows manual entry form (not a crash)
- [ ] **AI insight fallback:** When LLM API times out — verify `insight_available: false` fallback message appears (not a spinner forever)
- [ ] **Goal progress math:** Allocate to a goal — verify `nominal_terkumpul` and `progress_pct` update correctly (not cached stale values)
- [ ] **Backend warm on demo day:** Hit the Render URL 2 minutes before presenting — verify <200ms response time

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Blank screen in Tauri APK | MEDIUM | Add `output: 'export'` to next.config.ts, rebuild frontend (`npm run build`), rebuild Tauri APK (`tauri android build`) — ~1-2 hours |
| SAW engine crashing on edge cases | LOW | Add guard clauses (empty list, single goal, equal values) — ~30 min code, ~30 min test |
| API contract drift discovered at integration | HIGH | Manual field-by-field comparison of mock JSON vs backend response; update either mock or backend to match — can take 4-8 hours if drift is widespread |
| Auth not persisting in APK | MEDIUM | Add `tauri-plugin-store` and custom Supabase storage adapter — ~2-3 hours including testing on device |
| AI provider not chosen before Kelompok 3 | MEDIUM | Choose a provider (1 hour decision), install SDK, update requirements.txt, add env vars, implement basic wrapper — 3-4 hours before any feature code can start |
| Render cold start on demo day | LOW | Wake service manually 2 minutes before demo; or set up UptimeRobot (10 minutes) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Severity | Prevention Phase | Verification |
|---------|----------|------------------|--------------|
| Missing `output: 'export'` in next.config.ts | SHOW-STOPPER | Kelompok 1 — Foundation | `next build` completes; `out/` directory exists |
| Server Actions used anywhere | SHOW-STOPPER | Kelompok 1 — Foundation | Search codebase for `'use server'` directive — must find zero |
| Dynamic routes missing `generateStaticParams()` | SHOW-STOPPER | Kelompok 1 — Foundation | `next build` completes without dynamic route errors |
| `apps/native/` scaffold missing | SHOW-STOPPER | Kelompok 1 — Foundation | APK produced by `tauri android build` on day 2 |
| Supabase session not persisting in WebView | SHOW-STOPPER | Kelompok 1 — Foundation | Close/reopen APK — auth token persists |
| FastAPI JWT wrong algorithm/missing audience | SHOW-STOPPER | Kelompok 1 — Foundation | Protected endpoint returns 200 with valid token, 401 with invalid |
| SAW division by zero on edge cases | SHOW-STOPPER | Kelompok 2 — Inti Produk | Unit tests pass for 0-goal, 1-goal, and identical-value cases |
| SAW weight float precision validation | DEMO-RISK | Kelompok 2 — Inti Produk | Default weights accepted by `PUT /api/goal-settings` |
| `allocation_suggestion_available` flag missing | DEMO-RISK | Kelompok 2 — Inti Produk | Integration test: POST side income → modal appears |
| Render cold start during demo | DEMO-RISK | Kelompok 1 — Foundation (UptimeRobot setup) | Response time <500ms 5 minutes after last request |
| API contract drift | DEMO-RISK | Kelompok 1 — Foundation (lock contract v1.0) | TypeScript compiles with zero type errors after switching from mock to real API |
| LLM provider not chosen | DEMO-RISK | Kelompok 3 — Pelengkap (day 1 decision) | `POST /api/transactions/scan-receipt` returns structured JSON within 10s |
| Backend venv committed to git | NICE-TO-FIX | Kelompok 1 — Foundation | `git ls-files backend/venv/` returns no output |
| CORS not configured | SHOW-STOPPER | Kelompok 1 — Foundation | Tauri WebView network call succeeds (no CORS error in logs) |

---

## Sources

- Next.js static export official guide: https://nextjs.org/docs/app/guides/static-exports (authoritative, version 16.2.9)
- Tauri 2.0 Next.js setup guide: https://v2.tauri.app/start/frontend/nextjs/ (authoritative)
- FastAPI Supabase JWT integration: https://dev.to/j0/integrating-fastapi-with-supabase-auth-780 (web, LOW confidence)
- FastAPI Supabase JWT Python: https://dev.to/zwx00/validating-a-supabase-jwt-locally-with-python-and-fastapi-59jf (web, LOW confidence)
- SAW normalization techniques: https://www.sciencedirect.com/science/article/pii/S1877050922001570 (academic, LOW confidence for edge cases)
- LLM graceful degradation: https://www.buildmvpfast.com/blog/building-with-unreliable-ai-error-handling-fallback-strategies-2026 (web, LOW confidence)
- Render cold start solutions: https://medium.com/@sauravhldr/fix-render-com-free-tier-slow-initial-load-cold-start-problem-using-free-options-and-easy-steps-c0b6c7af8276 (web, LOW confidence)
- API contract drift: https://dev.to/qa-leaders/your-api-tests-are-lying-to-you-the-schema-drift-problem-nobody-talks-about-4h86 (web, LOW confidence)
- Finance app UX retention data: https://theuxda.com/blog/top-20-financial-ux-dos-and-donts-to-boost-customer-experience (web, LOW confidence)
- Tauri Supabase OAuth example: https://github.com/JeaneC/tauri-oauth-supabase (community, LOW confidence)
- Codebase concerns already identified: `.planning/codebase/CONCERNS.md` (project analysis, HIGH confidence for known issues)

---

*Pitfalls research for: Macost — Student Pocket MIS (Next.js + FastAPI + Supabase + Tauri 2.0)*
*Researched: 2026-06-30*
*All confidence levels LOW — cross-check critical implementation details against official documentation before building*
