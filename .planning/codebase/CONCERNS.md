# Codebase Concerns

**Analysis Date:** 2026-06-30

---

## Tech Debt

**Backend is a skeleton — no implemented endpoints:**
- Issue: `backend/main.py` is 7 lines containing only a root health-check route. All 20+ endpoints defined in `API_CONTRACT.md` are unimplemented. No router files, no service layer, no `backend/services/saw_engine.py` referenced by CLAUDE.md.
- Files: `backend/main.py`
- Impact: The entire application has no working backend. Frontend is hardcoded to mock JSON files.
- Fix approach: Implement FastAPI routers per domain (auth, wallets, categories, transactions, goals, allocations, dashboard, ai-insight) in `backend/routers/`, and move logic to `backend/services/`.

**Frontend is an unmodified create-next-app scaffold:**
- Issue: `apps/web/app/page.tsx` is the default Next.js template page with Next.js logo, "To get started, edit the page.tsx file.", and Vercel links. No application UI has been built — no login screen, no dashboard, no transaction forms, no goal pages.
- Files: `apps/web/app/page.tsx`, `apps/web/app/layout.tsx`
- Impact: Zero user-facing functionality exists in the frontend codebase.
- Fix approach: Replace default page with Macost application routing (`/login`, `/dashboard`, `/transactions`, `/goals`, `/settings`).

**Backend has no dependency manifest:**
- Issue: There is no `requirements.txt`, `pyproject.toml`, or `Pipfile` in `backend/`. The only evidence of installed packages is `backend/venv/` (a local virtual environment directory). Other developers cannot reproduce the Python environment without knowing which packages to install.
- Files: `backend/` (directory — manifest missing)
- Impact: Any team member pulling the repo cannot run the backend. CI cannot install dependencies.
- Fix approach: Run `pip freeze > requirements.txt` inside the venv, or switch to `pyproject.toml` with `pip install -e .`.

**`apps/native/` (Tauri wrapper) does not exist:**
- Issue: CLAUDE.md lists `apps/native/` as a monorepo member and assigns Hidayat ownership of it. The directory does not exist in the repo. The `.gitignore` references `apps/native/src-tauri/target/` confirming the intent, but no scaffold has been created.
- Files: `apps/native/` (absent), `CLAUDE.md`, `.gitignore`
- Impact: The mobile/desktop packaging target is entirely missing. Static export from Next.js cannot be wired to Tauri.
- Fix approach: Scaffold with `npm create tauri-app` into `apps/native/`, configure `apps/web/next.config.ts` with `output: 'export'`, and wire the build.

**`next.config.ts` missing static export configuration:**
- Issue: CLAUDE.md states the frontend targets "static export untuk Tauri" but `apps/web/next.config.ts` is empty (`const nextConfig: NextConfig = {}`). Without `output: 'export'`, the Next.js build produces a server-rendered output incompatible with Tauri's file-based webview loading.
- Files: `apps/web/next.config.ts`
- Impact: Tauri build will fail or load blank screens when Tauri wrapper is eventually created.
- Fix approach: Add `output: 'export'` and confirm App Router dynamic route compatibility with static export constraints.

**Mock data completely decoupled from API client:**
- Issue: `apps/web/mocks/` contains four JSON files (`dashboard.json`, `goals.json`, `transactions.json`, `allocation-suggestion.json`) used by the frontend instead of real API calls. There is no API client layer (no `fetch` wrappers, no Supabase client, no typed API functions) in the frontend.
- Files: `apps/web/mocks/dashboard.json`, `apps/web/mocks/goals.json`, `apps/web/mocks/transactions.json`, `apps/web/mocks/allocation-suggestion.json`
- Impact: Transitioning from mock to real API requires touching every component that directly imports mock JSON — there is no abstraction to swap out.
- Fix approach: Create `apps/web/lib/api/` with per-domain fetch clients. Mock files can remain as MSW fixtures or be deleted when real backend is ready.

**SAW engine referenced but not written:**
- Issue: CLAUDE.md documents the SAW algorithm with 5 criteria and specific weights (`personal_importance: 0.225`, `progress_gap: 0.219`, `saving_capacity: 0.215`, `urgency: 0.178`, `target_amount: 0.162`). The file `backend/services/saw_engine.py` is referenced but the `backend/services/` directory does not exist.
- Files: `backend/services/saw_engine.py` (absent)
- Impact: `GET /api/goals` and `GET /api/transactions/{id}/allocation-suggestion` cannot return ranked results.
- Fix approach: Create `backend/services/saw_engine.py` implementing normalized SAW scoring. Weights must be configurable per user via the `goal-settings` endpoint.

---

## Known Bugs

**`.gitignore` is malformed — written as shell heredoc, not as file content:**
- Symptoms: The `.gitignore` file begins with the literal text `cat > .gitignore << 'EOF'` followed by the ignore rules and ends with `EOF`. This means Git reads `cat > .gitignore << 'EOF'` as a path pattern (matching nothing). None of the intended exclusions (`node_modules/`, `venv/`, `.env`, `.next/`, etc.) take effect.
- Files: `.gitignore`
- Trigger: `git status` shows tracked files that should be ignored (e.g., `backend/venv/` and `apps/web/.next/` contents).
- Workaround: The `backend/venv/` directory is likely already committed to the repo as a result.
- Fix: Overwrite `.gitignore` with correct content (remove the `cat` heredoc wrapper lines), then run `git rm -r --cached backend/venv/ apps/web/.next/` to untrack already-committed artifacts.

**`backend/venv/` likely committed to the repository:**
- Symptoms: Because `.gitignore` is broken (see above), `backend/venv/` — which contains hundreds of megabytes of Python site-packages — is not ignored and may be tracked by Git.
- Files: `backend/venv/` (entire directory)
- Trigger: `git ls-files backend/venv/` will confirm.
- Fix: Fix `.gitignore` first, then run `git rm -r --cached backend/venv/` and commit.

---

## Security Considerations

**No authentication middleware in backend:**
- Risk: `API_CONTRACT.md` specifies `Authorization: Bearer <token>` (Supabase Auth JWT) on all endpoints except `/api/auth/*`. The current `backend/main.py` has no JWT validation, no dependency injection for auth, and no middleware.
- Files: `backend/main.py`
- Current mitigation: None — backend has no real endpoints yet.
- Recommendations: Add a FastAPI dependency (`get_current_user`) using `python-jose` or Supabase's JWT verification. Apply it as a default dependency on all routers except auth.

**Account lockout (NFR-05) not enforced:**
- Risk: `API_CONTRACT.md` specifies HTTP 423 with `ACCOUNT_LOCKED` after too many failed login attempts. No rate-limiting or lockout logic exists anywhere.
- Files: `backend/main.py` (auth endpoint absent)
- Recommendations: Implement attempt counting in Supabase (or Redis) and enforce lockout in the login endpoint. Consider delegating entirely to Supabase Auth's built-in rate limiting.

**No CORS configuration:**
- Risk: FastAPI defaults to no CORS headers. The Tauri webview and any PWA will be blocked by the browser when calling the backend unless CORS is configured. Conversely, an open CORS policy in dev may be accidentally deployed to production.
- Files: `backend/main.py`
- Recommendations: Add `CORSMiddleware` with explicit `allow_origins` list, restricting production to the Tauri origin and deployed frontend domain only.

**Receipt/statement upload endpoints have no file type validation defined:**
- Risk: `POST /api/transactions/scan-receipt` accepts `multipart/form-data` with an `image` field, and `POST /api/transactions/upload-statement` accepts a PDF. The contract does not specify server-side MIME type or size limits.
- Files: `API_CONTRACT.md` (§4)
- Recommendations: Enforce MIME type allowlist (`image/jpeg`, `image/png` for receipt; `application/pdf` for statement), maximum file size (e.g. 10 MB), and virus scan if hosting on a shared server.

---

## Performance Bottlenecks

**SAW ranking recalculated on every `GET /api/goals` call:**
- Problem: The `rank` field in `GET /api/goals` is documented as "hasil SAW real-time." With 5 criteria across N goals and per-user weight settings, this recalculation runs on every goals list request.
- Files: `backend/services/saw_engine.py` (to be created), `API_CONTRACT.md` (§5)
- Cause: No caching strategy is defined; weights and goal data change infrequently but ranking is computed on every read.
- Improvement path: Cache the ranked list in Redis or Supabase with invalidation on `PUT /api/goal-settings` and `POST/PUT/DELETE /api/goals`.

**Dashboard aggregation queries unbounded by period default:**
- Problem: `GET /api/dashboard` has optional `period` and `start_date`/`end_date` query params. If no period is supplied, the aggregation scope is undefined in the contract and may default to all-time data.
- Files: `API_CONTRACT.md` (§8)
- Cause: Missing documented default behavior for period parameter.
- Improvement path: Define an explicit default (`this_month`) in both the contract and backend implementation to prevent unbounded aggregation queries.

**Float arithmetic in SAW weight validation:**
- Problem: `PUT /api/goal-settings` requires weights to sum to exactly `1.0`. Floating point addition of five values (e.g., `0.225 + 0.219 + 0.215 + 0.178 + 0.162 = 0.9990000...`) may not equal `1.0` exactly.
- Files: `API_CONTRACT.md` (§6)
- Cause: IEEE 754 floating point imprecision.
- Improvement path: Validate with `abs(sum(weights.values()) - 1.0) < 0.001` tolerance rather than strict equality.

---

## Fragile Areas

**API contract is marked as unreviewed draft:**
- Files: `API_CONTRACT.md`
- Why fragile: The contract header states "v0.1 (draft awal — review bersama Hidayat & Fertika sebelum dikunci)". If frontend developers (Khayyira, Zarra) begin building against mock data whose shape differs from what the backend eventually implements, a silent contract mismatch will emerge that only surfaces at integration time.
- Safe modification: Do not build frontend data-fetching layers until the contract is formally locked (version bump to v1.0 with team sign-off).
- Test coverage: None — no contract tests or schema validation exist.

**Parallel development with no shared integration environment:**
- Files: `CLAUDE.md` (team table), `.github/workflows/` (empty directory)
- Why fragile: Four developers work in separate branches (`backend/...`, `frontend/...`, `native/...`) with no CI pipeline, no shared dev server, and no integration tests. Each person's work is validated in isolation only.
- Safe modification: Establish a shared staging environment (e.g., Render for backend + Vercel for frontend) and run integration checks on every PR before merging to `main`.

**`allocation_suggestion_available` flag creates a tightly coupled frontend trigger:**
- Files: `API_CONTRACT.md` (§4, POST /api/transactions response)
- Why fragile: The `POST /api/transactions` response includes `allocation_suggestion_available: true` as a signal for the frontend to immediately call `GET /api/transactions/{id}/allocation-suggestion`. This creates a timing dependency — if the frontend misses or ignores this flag, the smart allocation flow silently breaks.
- Safe modification: Supplement with a polling endpoint or WebSocket notification for pending allocations (`GET /api/allocations/pending` already exists — ensure UI polls this on app resume).

**`skor_kepentingan` is calculated server-side from deadline only:**
- Files: `API_CONTRACT.md` (§5, POST /api/goals)
- Why fragile: The contract states "skor_kepentingan dihitung otomatis dari deadline" but provides no formula. The frontend displays this value and uses it in SAW ranking. If the calculation logic changes, the displayed importance score changes without user awareness.
- Safe modification: Document the exact formula in the contract and CLAUDE.md. Consider exposing it as a read-only field with a `calculated_from` explanation in the API response.

---

## Scaling Limits

**Render free tier for backend hosting:**
- Current capacity: Render free tier spins down after 15 minutes of inactivity; first request after sleep takes 30–60 seconds.
- Limit: Unacceptable for a mobile app where users expect instant response. Student demo environment may mask this if testers wake the service before presentation.
- Scaling path: Use Render paid tier, or configure a keep-alive cron ping (`GET /`).

---

## Dependencies at Risk

**No pinned LLM provider for AI insight and receipt OCR:**
- Risk: `GET /api/ai-insight` and `POST /api/transactions/scan-receipt` depend on an AI/LLM provider that is not identified anywhere in the codebase or contract. No SDK is imported, no API key env var is named.
- Impact: FR-002 (scan receipt), FR-012 (AI insight), and FR-017 (fallback) cannot be implemented until the provider is chosen and integrated.
- Migration plan: Decide on a provider (e.g., Google Vision API for OCR, OpenAI/Anthropic for insight), add to CLAUDE.md, and define the env var names in `.env.example`.

---

## Missing Critical Features

**No `.env.example` file:**
- Problem: There is no `.env.example` or documentation of required environment variables. CLAUDE.md mentions Supabase but no env var names (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are documented anywhere.
- Blocks: Any developer cloning the repo cannot configure a working local environment without asking another team member.

**No `docker-compose.yml` despite CLAUDE.md promise:**
- Problem: CLAUDE.md states "Local dev: Docker Compose" but there is no `docker-compose.yml` in the repository root.
- Blocks: Consistent local development environment across all four team members.

**No Supabase schema or seed files:**
- Problem: No migration files, schema SQL, or seed data exist in the repository. The ERD and entity structure are referenced only in `API_CONTRACT.md` prose.
- Blocks: Any developer setting up a new Supabase project has no automated way to create the required tables.

**`GET /api/wallets` has no corresponding FR in the PRD:**
- Problem: `API_CONTRACT.md` notes the wallets endpoints exist in the ERD but have no functional requirement number. CLAUDE.md has a note to propose FR-018.
- Blocks: Without a formal FR, the feature scope (which wallet operations are required for MVP) is undefined, risking over- or under-implementation.

---

## Test Coverage Gaps

**Zero test files in the entire repository:**
- What's not tested: All backend logic (auth, transaction creation, SAW ranking, allocation), all frontend components, all API contract conformance.
- Files: `backend/`, `apps/web/`
- Risk: Any implementation can break silently. Four developers merging to `main` without tests creates high regression risk at integration points.
- Priority: High

**SAW algorithm has no verification against survey data:**
- What's not tested: The five SAW criteria weights (`personal_importance: 0.225`, etc.) are sourced from a survey (n=62) and must produce reproducible rankings. Without unit tests, any change to `backend/services/saw_engine.py` could silently produce incorrect goal rankings.
- Files: `backend/services/saw_engine.py` (to be created)
- Risk: Incorrect rankings affect FR-009 and FR-010 — core differentiating features of the product.
- Priority: High

**No contract/integration tests between frontend mock data and API contract:**
- What's not tested: The shape of `apps/web/mocks/*.json` is not validated against `API_CONTRACT.md`. Silent schema drift between mock data and the real API will only surface at integration time.
- Files: `apps/web/mocks/`, `API_CONTRACT.md`
- Risk: Frontend UI built against incorrect mock shapes will require rework when connected to the real backend.
- Priority: Medium

---

*Concerns audit: 2026-06-30*
