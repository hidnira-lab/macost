# Architecture Research

**Domain:** Mobile-first financial MIS (Next.js static export + FastAPI + Supabase + Tauri 2.0 Android)
**Researched:** 2026-06-30
**Confidence:** MEDIUM — official docs confirmed, Tauri Android specifics partially community-sourced

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                  │
├──────────────────────────────┬──────────────────────────────────────┤
│  apps/web/                   │  apps/native/                        │
│  Next.js 15 (App Router)     │  Tauri 2.0 wrapper                   │
│  static export → out/        │  loads out/ in Android WebView       │
│  All data via fetch + SWR    │  PWA fallback if Tauri fails         │
│  lib/api/ client layer       │  tauri.conf.json wires build         │
└──────────────────┬───────────┴──────────────┬───────────────────────┘
                   │  HTTP REST + JWT Bearer   │  file:// or tauri://
                   ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend Layer                                 │
│  backend/main.py — FastAPI (Python)                                 │
│  CORS middleware (allow Tauri origin + localhost)                   │
│  JWTBearer dependency — validates Supabase JWT on every request     │
│  Routers: auth, wallets, categories, transactions, goals,           │
│           allocations, dashboard, ai_insight                        │
│  Services: saw_engine, allocation_service, ai_service               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │  supabase-py (service role)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Auth)                                       │
│  Auth: JWT issuance (HS256, audience="authenticated")               │
│  DB: 6 entities — Pengguna, Dompet, Kategori, Transaksi,           │
│       Goal, Alokasi                                                  │
│  RLS: enforced via service role + user_id filter in queries         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `apps/web/app/` | UI pages, routing, user interaction | `apps/web/lib/api/` only |
| `apps/web/lib/api/` | API client layer (mock or real) | FastAPI backend |
| `apps/web/lib/offline/` | IndexedDB cache for FR-016 | IndexedDB (browser API) |
| `apps/native/src-tauri/` | Android packaging, WebView config | `apps/web/out/` (static build) |
| `backend/routers/` | Request handling, response shaping | `backend/services/`, `backend/db/` |
| `backend/services/saw_engine.py` | SAW goal ranking computation | Called by goals router |
| `backend/services/allocation_service.py` | Allocation percentage calculation | Called by allocations router |
| `backend/services/ai_service.py` | Receipt OCR + one-way insight generation | External LLM/Vision API |
| `backend/dependencies.py` | JWT validation (`JWTBearer`), `get_current_user` | All protected routers |
| `backend/db/supabase_client.py` | supabase-py client factory, `set_auth` per request | Supabase |
| Supabase Auth | JWT issuance and validation reference | FastAPI (JWT secret) |
| Supabase PostgreSQL | Data persistence, no direct frontend access | FastAPI only |

## Recommended Project Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # authenticated shell, checks token
│   │   ├── dashboard/page.tsx    # FR-006 KPI order locked
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── goals/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx     # MUST export generateStaticParams()
│   │   ├── settings/page.tsx
│   │   └── notifications/page.tsx  # pending allocations
│   ├── layout.tsx
│   └── page.tsx                  # redirect to /dashboard or /login
├── lib/
│   ├── api/
│   │   ├── client.ts             # base fetch with Authorization header
│   │   ├── transactions.ts
│   │   ├── goals.ts
│   │   ├── allocations.ts
│   │   ├── dashboard.ts
│   │   ├── wallets.ts
│   │   └── ai.ts
│   ├── offline/
│   │   └── cache.ts              # IndexedDB wrapper (idb package)
│   └── auth/
│       └── token.ts              # Supabase session management
└── mocks/                        # keep as MSW fixtures during dev

backend/
├── main.py                       # FastAPI app, CORS middleware, lifespan
├── dependencies.py               # JWTBearer, get_current_user
├── routers/
│   ├── auth.py
│   ├── wallets.py
│   ├── categories.py
│   ├── transactions.py
│   ├── goals.py
│   ├── allocations.py
│   ├── dashboard.py
│   └── ai_insight.py
├── services/
│   ├── saw_engine.py             # SAW with configurable weights
│   ├── allocation_service.py     # 30-40% calculation logic
│   └── ai_service.py             # LLM/OCR integration
├── models/
│   └── schemas.py                # Pydantic request/response models
├── db/
│   └── supabase_client.py        # client factory
└── requirements.txt

apps/native/
└── src-tauri/
    ├── tauri.conf.json           # build commands, frontendDist, Android config
    ├── Cargo.toml
    └── src/
        └── main.rs
```

### Structure Rationale

- **`lib/api/`:** Centralizes all backend calls. A single `USE_MOCK` env flag switches between mock JSON and real API across all pages without touching component code. This is the critical bridge for parallel team development.
- **`lib/offline/`:** Isolated from API client. Cache layer wraps API calls but the API client itself stays clean.
- **`(auth)/` and `(app)/` route groups:** Separate authentication layout from app layout. App layout can enforce token presence without duplicating auth checks in every page.
- **`generateStaticParams()` required on `[id]` routes:** Static export will fail without it. For goals detail page, export an empty array to allow client-side data fetching (the page shell is static, data loads at runtime).
- **`backend/routers/` per domain:** Each team member owns one router file. Reduces merge conflicts.

## Architectural Patterns

### Pattern 1: API Client Layer with Mock Flag

**What:** A thin `lib/api/client.ts` wraps all `fetch` calls. It reads `process.env.NEXT_PUBLIC_USE_MOCK` and returns mock JSON when true, or calls FastAPI when false.

**When to use:** Always. This is the enabler for parallel frontend/backend development.

**Trade-offs:** Small indirection cost, but eliminates the need to touch every component at integration time. Without this layer, integration requires a component-by-component find-and-replace.

**Example:**
```typescript
// lib/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  mockData?: T
): Promise<T> {
  if (USE_MOCK && mockData !== undefined) return mockData
  const token = getToken() // from lib/auth/token.ts
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options?.headers }
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

// lib/api/goals.ts
import goalsData from '@/mocks/goals.json'
export const getGoals = () => apiFetch('/api/goals', undefined, goalsData)
```

### Pattern 2: JWTBearer FastAPI Dependency

**What:** A single reusable dependency class that validates every Supabase JWT on protected routes. The audience must be `"authenticated"` — this is the single most common missed gotcha.

**When to use:** Apply to every router except `/api/auth/*`.

**Trade-offs:** Adds one JWT decode overhead per request. This is unavoidable and negligible.

**Example:**
```python
# backend/dependencies.py
import os
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]

class JWTBearer(HTTPBearer):
    async def __call__(self, request: Request) -> dict:
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials.scheme.lower() != "bearer":
            raise HTTPException(status_code=403, detail="Invalid auth scheme")
        try:
            payload = jwt.decode(
                credentials.credentials,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"   # CRITICAL: omitting this breaks all auth
            )
            return payload
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(payload: dict = Depends(JWTBearer())) -> str:
    return payload["sub"]  # user UUID
```

### Pattern 3: SAW Engine Isolated as Pure Service

**What:** `saw_engine.py` is a stateless function — takes a list of goals + weight config, returns ranked list. No database calls inside the engine.

**When to use:** Called by the goals router after fetching goals from Supabase. Keeps the ranking logic testable in isolation.

**Trade-offs:** Adds a minimal per-request computation (O(n * 5) where n = user's goal count, typically < 20). No caching needed at MVP scale.

**Example:**
```python
# backend/services/saw_engine.py
from dataclasses import dataclass

DEFAULT_WEIGHTS = {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162,
}

def rank_goals(goals: list[dict], weights: dict = DEFAULT_WEIGHTS) -> list[dict]:
    if not goals:
        return []
    # Normalize each criterion (min-max)
    # ... normalization logic ...
    # Weighted sum
    for goal in goals:
        goal["saw_score"] = sum(
            goal[f"norm_{k}"] * v for k, v in weights.items()
        )
    goals.sort(key=lambda g: g["saw_score"], reverse=True)
    for i, goal in enumerate(goals, 1):
        goal["rank"] = i
    return goals
```

## Data Flow

### Side Income → Allocation Suggestion Flow

```
User inputs side income transaction (Client Component form)
    │
    ▼
POST /api/transactions   { tipe: "Pemasukan", kategori_id: "freelance-uuid", nominal: 500000, ... }
    │
    ▼
[FastAPI] JWTBearer validates token → extracts user_id
    │
    ▼
[FastAPI] Looks up category.flag_pemasukan → "Flexible Side Income"
[FastAPI] Persists transaction, sets source_label = "Flexible Side Income"
    │
    ▼
Response: { id_transaksi: "...", source_label: "Flexible Side Income",
            allocation_suggestion_available: true }
    │
Frontend detects allocation_suggestion_available: true
    │
    ▼
GET /api/transactions/{id}/allocation-suggestion
    │
    ▼
[FastAPI] Loads all user goals from Supabase
[FastAPI] Loads user goal-settings (weights + strategy)
[FastAPI] saw_engine.rank_goals(goals, weights)
[FastAPI] Calculates suggested_amount = nominal * 0.35 (30-40% of side income)
    │
    ▼
Response: { has_active_goal: true, suggested_goal_id: "...",
            suggested_goal_name: "Beli Laptop", suggested_amount: 175000,
            suggested_pct: 35, alternative_goals: [...] }
    │
Frontend shows allocation modal (Sitemap #16) — NEVER auto-executes
    │
User confirms
    │
    ▼
POST /api/allocations   { transaksi_id: "...", goal_id: "...", nominal_alokasi: 175000 }
    │
    ▼
[FastAPI] Creates Alokasi record, updates nominal_terkumpul in Goal
Response: { id_alokasi: "...", goal_updated: { progress_pct: 42 } }
    │
Frontend updates goal progress display
```

### State Management

```
Supabase Auth (client-side)
    │
    ▼ access_token stored in memory (not localStorage — avoid XSS)
lib/auth/token.ts
    │
    ▼ attached to every request
lib/api/client.ts (apiFetch)
    │
    ├── USE_MOCK=true → return mocks/*.json (dev phase 1)
    │
    └── USE_MOCK=false → fetch FastAPI → response
                │
                ▼
        SWR cache (component-level, auto-revalidates)
                │
                ▼
        UI re-renders on data change
```

### Key Data Flows

1. **Dashboard load:** `GET /api/dashboard?period=this_month` → single aggregated response in research-validated KPI order (expense → goals → trend → alert → balance). No separate calls per widget.
2. **Goals ranking:** `GET /api/goals` → backend fetches goals + user weights → SAW engine → ranked list with `rank` field. Frontend just renders; no client-side ranking logic.
3. **Receipt scan:** `POST /api/transactions/scan-receipt` (multipart) → backend calls Vision API → returns pre-filled fields → user reviews → `POST /api/transactions` to save (two-step, never atomic).
4. **Offline queue (FR-016):** Failed `POST /api/transactions` stored in IndexedDB queue → retry on `navigator.onLine` event → same POST endpoint, no special sync endpoint needed.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| MVP demo (10 users) | Current architecture is fine. Render free tier + Supabase free tier. Add keep-alive cron ping to prevent 30s cold starts. |
| Student cohort (100–500 users) | Cache SAW results in Supabase or Redis (invalidate on goal CRUD / settings change). Add dashboard period default (`this_month`) to avoid full-table scans. |
| Post-academic scale (10k+) | Not in scope. Would need: connection pooling (Supabase PgBouncer), background job queue for AI processing, CDN for static Next.js assets. |

### Scaling Priorities

1. **First bottleneck:** Render free tier cold start (30–60 seconds after 15 min idle). Fix: add a lightweight keep-alive cron (`GET /` every 10 minutes) before demo day.
2. **Second bottleneck:** SAW recalculated on every `GET /api/goals`. Fix: in-memory cache per user_id with invalidation key on goal CRUD. Not needed for MVP with <20 goals per user.

## Anti-Patterns

### Anti-Pattern 1: Dynamic Routes Without generateStaticParams

**What people do:** Create `app/goals/[id]/page.tsx` and forget to export `generateStaticParams`.

**Why it's wrong:** `next build` with `output: 'export'` throws a build error for any dynamic route without `generateStaticParams`. The entire build fails — Tauri has nothing to package.

**Do this instead:** Export `generateStaticParams` returning an empty array. The page shell becomes a static HTML file; data loading happens client-side via SWR.

```typescript
// app/goals/[id]/page.tsx
export function generateStaticParams() {
  return [] // shell is static, data loads at runtime via SWR
}
```

### Anti-Pattern 2: Using Server Actions or Server-Only Route Handlers

**What people do:** Add `'use server'` directives or mutation Route Handlers that read from `request.json()`.

**Why it's wrong:** Server Actions are explicitly unsupported in static exports. The build will error or the feature will silently not work in Tauri WebView.

**Do this instead:** All mutations go through direct `fetch` to FastAPI. The API client layer in `lib/api/` handles this correctly already.

### Anti-Pattern 3: Direct Supabase Client from Frontend

**What people do:** Import `@supabase/supabase-js` in page components and call `supabase.from('goals').select()` directly.

**Why it's wrong:** Bypasses FastAPI entirely, meaning SAW ranking, source labeling, and business logic are skipped. RLS must be configured independently and duplicates logic.

**Do this instead:** All data calls go through `lib/api/` → FastAPI → Supabase. The Supabase client is only used on the frontend for Auth (`supabase.auth.signIn`, `getSession`).

### Anti-Pattern 4: Storing JWT in localStorage

**What people do:** `localStorage.setItem('token', access_token)` for persistence across page refreshes.

**Why it's wrong:** In Tauri WebView (Android), localStorage persists fine, but this is an XSS vector. More critically, Supabase session management already handles token refresh automatically — manually storing the raw JWT breaks auto-refresh.

**Do this instead:** Use Supabase's own session management (`supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`). Extract the `access_token` from the session object at request time.

### Anti-Pattern 5: Skipping CORS Middleware

**What people do:** Assume Tauri WebView doesn't need CORS so skip `CORSMiddleware` in FastAPI.

**Why it's wrong:** Tauri WebView on Android doesn't enforce CORS — but browser-based local dev (`localhost:3000` → `localhost:8000`) does. Without CORS middleware, the entire team cannot test against the real backend in a browser during development.

**Do this instead:** Add `CORSMiddleware` from day 1 with `allow_origins=["http://localhost:3000", "tauri://localhost"]`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | Frontend: `@supabase/supabase-js` session management. Backend: JWT decode via PyJWT (not supabase-py auth methods) | JWT secret from Supabase dashboard Settings → Auth. Audience MUST be `"authenticated"`. Algorithm: HS256. |
| Supabase PostgreSQL | Backend: `supabase-py` with service role key. Call `client.auth.set_session(access_token, refresh_token)` per-request for RLS, or apply user_id filter in queries manually | Do NOT use anon key in backend — service role bypasses RLS intentionally so backend controls access |
| LLM / Vision API (TBD) | Backend `ai_service.py` only. Frontend never calls AI APIs directly. Timeout: OCR >10s, LLM >15s → return fallback response (FR-017) | Provider not yet chosen. Must add to `.env.example` and `CLAUDE.md` before FR-002/FR-012 phase |
| Render (hosting) | FastAPI deployed via Render Web Service. Free tier has cold start problem — add keep-alive cron before demo | Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` as Render env vars |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web/` ↔ `backend/` | HTTP REST per `API_CONTRACT.md`. Any shape change requires full team communication before implementation | Contract is v0.1 draft — lock to v1.0 before Khayyira/Zarra start data-fetching layer |
| `apps/web/` ↔ `apps/native/` | Tauri reads `apps/web/out/` as static files. No IPC needed for MVP — pure WebView | `apps/web/next.config.ts` must have `output: 'export'` and `images: { unoptimized: true }` before Tauri scaffold |
| `backend/routers/` ↔ `backend/services/` | Direct Python function calls. Routers are thin (validation + routing); services own business logic | SAW engine must be pure function — no side effects, no DB calls inside |
| `backend/` ↔ Supabase | `supabase-py` client. Single global client with service role key; call `set_auth` per-request when RLS matters | RLS policies must be defined in Supabase SQL before first integration test |

## Offline Cache Strategy (FR-016)

**Recommendation: IndexedDB via `idb` package (4KB, typed, Promise-based)**

Do NOT use service workers for API caching. Tauri Android WebView has limited and inconsistent service worker support. Do not use `tauri-plugin-store` for API response caching — it is key-value only and not suited for list data.

**Implementation:**

```typescript
// lib/offline/cache.ts
import { openDB } from 'idb'

const DB_NAME = 'macost-cache'
const STORE = 'api-cache'

export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE) }
  })
  const entry = await db.get(STORE, key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) return null
  return entry.data as T
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  const db = await openDB(DB_NAME, 1)
  await db.put(STORE, { data, timestamp: Date.now() }, key)
}
```

**Cache TTLs:**
- `GET /api/dashboard`: 5 minutes (stale acceptable for KPI display)
- `GET /api/goals`: 2 minutes (changes after allocation confirmation)
- `GET /api/transactions`: 1 minute (changes frequently)
- `GET /api/categories`: 24 hours (seed data, read-only)

**Offline write queue:** Store failed `POST /api/transactions` in IndexedDB with status `pending`. On `navigator.onLine` event, flush the queue. Display pending count in UI.

## Build Order for 4-Person Parallel Team

### Phase Ordering Rationale

The API contract is the integration seam. Frontend and backend can develop in parallel only if the contract is locked first and the API client layer (`lib/api/`) isolates frontend from real endpoints.

**Pre-work (Day 0-1, Hidayat):**
1. Lock API contract to v1.0 (review with Fertika, sign off)
2. Configure `apps/web/next.config.ts`: `output: 'export'`, `images: { unoptimized: true }`
3. Scaffold `apps/native/` with `npm create tauri-app`, wire `frontendDist: "../web/out"`, `devUrl: "http://localhost:3000"`
4. Create `apps/web/lib/api/client.ts` with `USE_MOCK` flag
5. Create `.env.example` with all required vars

**Backend parallel track (Fertika, Day 1-5):**
1. `requirements.txt`, `backend/dependencies.py` (JWTBearer), `backend/main.py` (CORS)
2. Auth router (register/login via supabase-py)
3. Wallets + Categories routers (simple CRUD)
4. Transactions router (with source_label logic)
5. Goals router + `saw_engine.py`
6. Allocations router
7. Dashboard router (aggregation query)
8. AI insight + receipt scan (last, can use stub initially)

**Frontend parallel track (Khayyira + Zarra, Day 1-7):**
- All pages use `lib/api/` with `USE_MOCK=true` — no backend dependency
- Khayyira: Goals pages (list, detail, create, settings)
- Zarra: Dashboard + Transaction pages
- Both: implement allocation modal (Sitemap #16) per Figma design

**Integration track (Hidayat + all, Day 6-8):**
1. Set `USE_MOCK=false`, point `NEXT_PUBLIC_API_URL` to local FastAPI
2. Test each flow against real backend
3. Fix contract mismatches (shape drift between mocks and real API)
4. Tauri Android build: `pnpm tauri android build`
5. Install APK on test device, verify all flows

**Day 9-10: Polish + Demo Prep:**
- FR-016 offline cache implementation
- Pixel art visualization (FR-015, pure frontend)
- Render keep-alive cron setup
- Expo presentation prep

## Sources

- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports) — official docs, MEDIUM confidence
- [Tauri 2.0 Next.js Integration](https://v2.tauri.app/start/frontend/nextjs/) — official docs, MEDIUM confidence
- [Integrating FastAPI with Supabase Auth](https://dev.to/j0/integrating-fastapi-with-supabase-auth-780) — community article, MEDIUM confidence
- [tauri-nextjs-starter (Tauri v2 + Next.js v15)](https://github.com/motz0815/tauri-nextjs-starter) — working example, MEDIUM confidence
- [Persistent State in Tauri Apps](https://aptabase.com/blog/persistent-state-tauri-apps) — IndexedDB vs tauri-plugin-store comparison, LOW confidence
- [supabase-py Row Level Security discussion](https://github.com/orgs/supabase/discussions/3479) — community discussion, LOW confidence
- `.planning/codebase/ARCHITECTURE.md` — existing codebase analysis, HIGH confidence (first-party)
- `.planning/codebase/CONCERNS.md` — known tech debt and concerns, HIGH confidence (first-party)
- `API_CONTRACT.md` — authoritative endpoint definitions, HIGH confidence (first-party)

---
*Architecture research for: Macost — Next.js static export + FastAPI + Supabase + Tauri 2.0 Android*
*Researched: 2026-06-30*
