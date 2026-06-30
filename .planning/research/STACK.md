# Stack Research

**Domain:** Mobile-first financial management app (student MIS)
**Researched:** 2026-06-30
**Confidence:** MEDIUM (official docs verified via webfetch; confidence tool reports LOW for webfetch provider — see Sources section for authoritative URL list)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.9 (current in repo) | Frontend SPA / static export | App Router + `output: 'export'` is the only way to produce a static bundle Tauri 2.0 can wrap. No alternative: Tauri does not support SSR/Node server. |
| React | 19.2.4 (current in repo) | UI rendering | Ships with Next.js 16; no separate decision needed. |
| FastAPI | 0.138.2 (current in repo) | REST API, business logic, SAW engine | Best Python async HTTP framework; native Pydantic v2 models; zero-boilerplate dependency injection for JWT middleware. No reason to change. |
| Pydantic | 2.13.4 (current in repo) | Request/response validation | Required by FastAPI; v2 is the current stable line — v1 is EOL. |
| Supabase | Managed (PostgreSQL + Auth) | Auth (JWT), database, RLS | Provides Auth without a custom auth server; JWT can be verified locally in FastAPI without round-trips to Supabase. |
| Tauri | 2.0 | Android APK wrapper | Packages the static Next.js export as a native Android app. The 2.0 line is stable and the only one with official mobile (Android/iOS) support. |
| Tailwind CSS | 4.x (current in repo) | Utility-first styling | Already at v4 — do not downgrade; v4 is faster and auto-detects content files. |

### Supporting Libraries — Frontend

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | ^2 | Supabase auth client on frontend | Always — handles login, session, JWT refresh. Import `createClient` once in `lib/supabase.ts` and reuse. |
| `swr` | ^2 | Client-side data fetching + cache | For all API calls from `'use client'` components (static export has no SSR; SWR fills the gap cleanly). Alternative: TanStack Query, but SWR is lighter. |
| `@tauri-apps/api` | ^2 | Tauri IPC API in JavaScript | Only when calling native Tauri APIs from JS (e.g., file system, OS-level dialog). Not needed for plain HTTP fetch to FastAPI. |

### Supporting Libraries — Backend (Python)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase` (supabase-py) | ^2 | PostgreSQL CRUD via Supabase REST | Database reads/writes from FastAPI. Use `create_client(url, SERVICE_ROLE_KEY)` — service role bypasses RLS, which is correct because FastAPI is the trusted layer that enforces auth itself. |
| `PyJWT` | ^2 | Supabase JWT verification in FastAPI | **Use PyJWT, not python-jose.** python-jose is abandoned (last release ~3 years ago, broken on Python ≥ 3.10). FastAPI official docs have migrated to PyJWT. |
| `python-multipart` | 0.0.32 (current) | Multipart form data for receipt scan | Already installed. Required for `POST /api/transactions/scan-receipt`. |
| `uvicorn` | 0.49.0 (current) | ASGI production server | Already installed. Render.com deploys via `uvicorn main:app`. |
| `anyio` | ^4 | Async I/O abstraction | Pulled in transitively by FastAPI/Starlette. Do not pin separately. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@tauri-apps/cli` | Tauri build / dev commands | Install: `npm install -D @tauri-apps/cli@^2`. Commands: `tauri android init`, `tauri android dev`, `tauri android build`. |
| Android Studio | Required for Tauri Android | Must be installed before running any `tauri android` command. Set `ANDROID_HOME` and `JAVA_HOME` env vars. |
| Docker Compose | Local dev environment | Referenced in CLAUDE.md but not yet present in repo. Create `docker-compose.yml` for FastAPI + Supabase local dev. |
| ESLint 9.x + `eslint-config-next` | Linting | Already configured. |

---

## Critical Configuration Steps

### 1. Next.js Static Export (MUST DO before Tauri works)

`apps/web/next.config.ts` currently has no `output: 'export'` — this is a blocking gap. Add:

```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required: default Next.js image optimizer is incompatible with static export
  },
  // In dev, Tauri uses devUrl (http://localhost:3000) directly — assetPrefix not needed
  // In prod, output goes to out/ and Tauri reads it via frontendDist
  trailingSlash: true, // Recommended for file-system serving (Tauri reads index.html per directory)
}

export default nextConfig
```

**What breaks without this:** `tauri build` reads `frontendDist: "../out"` but `next build` without `output: 'export'` produces `.next/` server files, not `out/`. Build will fail silently.

### 2. Tauri `tauri.conf.json` (template for `apps/native/src-tauri/`)

```json
{
  "productName": "Macost",
  "version": "0.1.0",
  "identifier": "com.zephyra.macost",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "security": {
      "csp": "default-src 'self' ipc: asset: https://macost-api.onrender.com; connect-src ipc: asset: https://macost-api.onrender.com https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: blob:"
    }
  },
  "bundle": {
    "android": {
      "minSdkVersion": 24
    }
  }
}
```

### 3. Android HTTP Cleartext — Critical Gotcha

**Android 9+ (API 28+) blocks all cleartext HTTP by default.** This affects:
- Dev: `http://localhost:8000` (FastAPI dev server) — BLOCKED on Android device/emulator
- Prod: `https://macost-api.onrender.com` — works fine (HTTPS)

**Solution for dev:** Add `res/xml/network_security_config.xml` inside the Tauri Android project (generated at `gen/android/app/src/main/res/xml/`) and reference it in `AndroidManifest.xml`:

```xml
<!-- network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
  </network-security-config>
</network-security-config>
```

Use `10.0.2.2` (Android emulator alias for host `localhost`) for the emulator; use your dev machine's LAN IP for physical device testing.

**Alternative (simpler for demo):** Always call the production API (`https://macost-api.onrender.com`) even during device testing. Avoids the Android cleartext issue entirely and matches the demo environment.

### 4. Supabase JWT Verification in FastAPI

Install: `pip install PyJWT` (not `python-jose`).

```python
# backend/core/auth.py
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",  # Supabase always uses this audience
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Usage in router:
# @router.get("/wallets")
# async def get_wallets(user: dict = Depends(get_current_user)):
#     user_id = user["sub"]
```

Get `SUPABASE_JWT_SECRET` from: Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret.

### 5. FastAPI CORS for Tauri WebView

Tauri WebView on desktop uses `tauri://localhost`; on Android it varies. Allow all for demo scope:

```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",        # Next.js dev server
        "tauri://localhost",            # Tauri desktop WebView
        "https://tauri.localhost",      # Tauri WebView alternate scheme
        "http://localhost",             # Tauri Android WebView
        "https://macost.com",           # If PWA deployed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6. Tailwind CSS v4 — Already Correct

The project already uses `@tailwindcss/postcss` (v4 PostCSS plugin). Key v4 differences to know:
- No `tailwind.config.js` — configure via `@theme {}` block in `globals.css`
- `@import "tailwindcss"` replaces the old `@tailwind base/components/utilities` directives
- Content detection is automatic — no `content: []` array needed
- `bg-gradient-to-*` still works but canonical name is now `bg-linear-to-*`

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Mobile wrapper | Tauri 2.0 | React Native | RN requires full JavaScript rewrite of UI; Tauri reuses existing Next.js code — critical for 10-day timeline |
| Mobile wrapper | Tauri 2.0 | Capacitor | Capacitor is a valid alternative and easier to set up; Tauri chosen for lighter binary and Rust backend potential; decision already locked |
| API data fetching | SWR | TanStack Query | TanStack Query is more powerful but heavier; SWR is sufficient for this app's data complexity |
| JWT library | PyJWT | python-jose | python-jose abandoned; broken on Python ≥ 3.10; FastAPI docs migrated to PyJWT |
| Database access | supabase-py | psycopg2 / asyncpg direct | supabase-py wraps PostgREST and handles auth/RLS configuration; direct psycopg2 requires manual connection pooling setup |
| Styling | Tailwind CSS v4 | CSS Modules | Tailwind already chosen and at v4; no reason to change |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `python-jose` | Abandoned; broken on Python ≥ 3.10; FastAPI itself deprecated it from docs | `PyJWT` |
| Next.js Server Actions | Not supported in static export (`output: 'export'`) — will throw build errors | `fetch()` to FastAPI endpoints |
| Next.js Middleware | Not supported in static export | Move logic to FastAPI middleware |
| Next.js `cookies()` / `headers()` API | Not available in static export | Manage auth token in client state (`localStorage` via Supabase JS client) |
| `next/image` with default loader | Default image optimizer requires a Node server — incompatible with static export | `images: { unoptimized: true }` in next.config.ts, or use plain `<img>` tags |
| `output: 'standalone'` | This is for Docker/serverless deployment of Next.js as a Node server — incompatible with Tauri | `output: 'export'` |
| Direct Supabase DB access from frontend | Frontend must never bypass FastAPI; all data through API contract | Call FastAPI endpoints; read `source_label` from response (never send it) |
| Service role key in frontend | Service role key bypasses RLS — catastrophic security hole if exposed to client | Service role key only in FastAPI backend env vars |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.x | React 19.x | Ships together; do not mix major versions |
| Next.js 16.x | Tailwind CSS 4.x | Compatible; requires `@tailwindcss/postcss` not `tailwindcss` directly in postcss.config |
| Tauri 2.0 | `@tauri-apps/api` ^2 | Must match major version; Tauri 1.x APIs are incompatible |
| FastAPI 0.138.x | Pydantic 2.x | FastAPI 0.100+ requires Pydantic v2; earlier FastAPI used Pydantic v1 |
| PyJWT 2.x | Python 3.12 | Fully compatible |
| supabase-py 2.x | Python 3.12 | Fully compatible; use `create_client()` (sync) or `acreate_client()` (async) |

---

## Installation

```bash
# Frontend (apps/web/)
npm install @supabase/supabase-js swr
npm install -D @tauri-apps/cli@^2

# Backend (backend/) — activate venv first
pip install PyJWT supabase
# Confirm: pip install "PyJWT>=2.0" "supabase>=2.0"
```

---

## Environment Variables Required

| Variable | Where Used | Source |
|----------|-----------|--------|
| `SUPABASE_URL` | Frontend (Supabase JS client), Backend (supabase-py) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Frontend (Supabase JS client) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only — NEVER frontend | Supabase Dashboard → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Backend only (PyJWT verification) | Supabase Dashboard → Project Settings → API → JWT Settings |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend (API calls to FastAPI) | `http://localhost:8000` dev / `https://macost-api.onrender.com` prod |

---

## Sources

- `https://nextjs.org/docs/app/guides/static-exports` — Next.js 16.2.9 official docs: unsupported features list, configuration requirements (verified via webfetch from nextjs.org)
- `https://v2.tauri.app/start/frontend/nextjs/` — Tauri 2.0 official Next.js guide: required tauri.conf.json structure (verified via webfetch from tauri.app)
- `https://v2.tauri.app/reference/config/` — Tauri 2.0 config reference: CSP, capabilities, Android settings (verified via webfetch from tauri.app)
- `https://v2.tauri.app/plugin/localhost/` — Tauri localhost plugin docs (verified via webfetch from tauri.app)
- `https://tailwindcss.com/blog/tailwindcss-v4` — Tailwind v4 official release post: breaking changes, PostCSS migration (verified via webfetch)
- `https://github.com/tauri-apps/tauri/issues/10506` — Confirmed: Android WebView blocks cleartext HTTP (community issue, LOW confidence)
- `https://github.com/fastapi/fastapi/discussions/11345` — FastAPI decision to migrate from python-jose to PyJWT (LOW confidence, community discussion)
- `https://dev.to/zwx00/validating-a-supabase-jwt-locally-with-python-and-fastapi-59jf` — PyJWT + HTTPBearer pattern for Supabase (LOW confidence, secondary source)
- `https://developer.android.com/privacy-and-security/security-config` — Android Network Security Configuration docs (authoritative, via websearch reference)

---

*Stack research for: Macost — Next.js + FastAPI + Supabase + Tauri 2.0 (Android)*
*Researched: 2026-06-30*
