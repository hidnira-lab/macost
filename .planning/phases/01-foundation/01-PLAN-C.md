---
phase: 01-foundation
plan: C
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/package.json
  - apps/web/lib/api/client.ts
  - apps/web/lib/api/types.ts
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - WALL-01
  - WALL-02

must_haves:
  truths:
    - Setting NEXT_PUBLIC_USE_MOCK=true in .env.local causes apiFetch to return data from local JSON files in apps/web/mocks/ without hitting the network
    - Setting NEXT_PUBLIC_USE_MOCK=false (or absent) causes apiFetch to call process.env.NEXT_PUBLIC_API_BASE_URL with the correct Authorization header
    - TypeScript interfaces in types.ts match API_CONTRACT.md response field names and types exactly; tsc --noEmit passes with zero errors
    - apps/web/mocks/goals.json and apps/web/mocks/allocation-suggestion.json are verified to match the GET /api/goals and GET /api/transactions/{id}/allocation-suggestion shapes in API_CONTRACT.md
  artifacts:
    - apps/web/lib/api/client.ts — apiFetch<T>(path, init?) function with USE_MOCK conditional and Authorization header injection
    - apps/web/lib/api/types.ts — TypeScript interfaces covering all Phase 1 and Phase 2 API response shapes
    - apps/web/package.json — swr ^2 added to dependencies
  key_links:
    - NEXT_PUBLIC_USE_MOCK env var -> client.ts branch (wrong or missing = mock switch broken; integration switch requires code change)
    - types.ts interfaces -> mock JSON files (type mismatch = TypeScript catches drift before integration day)
    - apiFetch Authorization header -> getToken() from lib/auth/session.ts (this function is created by Track D; client.ts must import it from @/lib/auth/session)
---

<objective>
Create the shared API client abstraction layer with a USE_MOCK toggle and TypeScript interfaces for all Phase 1 and Phase 2 API shapes; verify existing mock JSON stubs are accurate against the API contract.

Purpose: Without a proper mock switch, Khayyira and Zarra cannot develop independently from Fertika's backend. TypeScript interfaces are the only automated check that catches API contract drift before integration day. The existing mocks in apps/web/mocks/ need verification against API_CONTRACT.md before they become the source of truth for frontend development.

Output: apps/web/lib/api/client.ts with USE_MOCK support and auth header injection; apps/web/lib/api/types.ts with complete Phase 1-2 interfaces; confirmed-accurate mock JSON stubs.

Owner: Khayyira — branch frontend/goals-foundation
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@API_CONTRACT.md
@apps/web/package.json
@apps/web/mocks/goals.json
@apps/web/mocks/allocation-suggestion.json
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install SWR and create API client with USE_MOCK toggle</name>
  <files>apps/web/package.json, apps/web/lib/api/client.ts</files>

  <read_first>
    apps/web/package.json — check current deps; swr is not yet installed
    API_CONTRACT.md — preamble: base URL is http://localhost:8000 dev / https://macost-api.onrender.com prod; all protected endpoints need Authorization: Bearer header; error response format {"error": {"code": ..., "message": ...}}
    apps/web/AGENTS.md — Next.js 16 breaking changes note; read before writing any TypeScript
    .planning/research/PITFALLS.md — Pitfall 11 (API contract drift; abstraction layer is mandatory even if it just returns mock data initially)
    .planning/research/STACK.md — section "Supporting Libraries — Frontend" for SWR recommendation and import pattern
  </read_first>

  <action>
    Add swr as a runtime dependency in apps/web/package.json. Run npm install swr from apps/web/ to install it and update package-lock.json.

    Note for merge: Track A (Hidayat) is also modifying apps/web/package.json on a separate branch to add @tauri-apps/plugin-store. When merging both branches, keep both additions in the dependencies section — there is no conflict in content, only a potential git merge conflict on the file that is easily resolved by keeping both added lines.

    Create the directory apps/web/lib/api/ and create apps/web/lib/api/client.ts.

    The client.ts file must export one primary function: apiFetch<T>(path: string, init?: RequestInit): Promise<T>. This function must:

    1. Read process.env.NEXT_PUBLIC_USE_MOCK to determine which data source to use. If the value is the string "true", route the call to the local mock resolver. If false, missing, or any other value, call the real API.

    2. Mock resolver: map the API path to a local JSON file in apps/web/mocks/. Implement a simple switch or object map that converts paths like "/api/wallets" to the wallets mock, "/api/goals" to the goals mock, "/api/dashboard" to the dashboard mock, "/api/transactions" to the transactions mock, and "/api/transactions/{id}/allocation-suggestion" to the allocation-suggestion mock. Use static imports (e.g., import walletsData from '@/mocks/wallets.json') — this approach works reliably in both dev and static export without a fetch round-trip and requires no files to be moved to public/. All mock JSON files stay in apps/web/mocks/ (Track D creates wallets.json and dashboard.json there). Return the imported data directly from the mock branch.

    3. Real API caller: read process.env.NEXT_PUBLIC_API_BASE_URL as the base URL (e.g., "http://localhost:8000"). Call getToken() from @/lib/auth/session (this module is created by Track D; if it does not exist yet on this branch, create a stub that returns null — the real implementation will be merged from Track D). Set the Authorization header to "Bearer {token}" when a token is available; omit the header when token is null (for public endpoints like register and login). Forward the init object (method, body, headers) to the fetch call. On non-2xx response: parse the body as JSON and throw it as an error — the caller is responsible for catching and displaying the error.

    4. Export a second helper apiMutate<T>(path: string, method: string, body: unknown, token?: string): Promise<T> that always calls the real API (mock mode does not apply to mutations like POST/PUT/DELETE). This is simpler than making apiFetch handle every HTTP method with mock data — reads are mocked, writes always go to the real API during development.

    TypeScript constraints: use 'use client' if any React import is needed, but this file should be a pure TypeScript module with no React imports. Use generic type parameter T for the return type. Ensure the file compiles with zero errors under strict mode (tsconfig.json has "strict": true).

    Do NOT use Server Actions, dynamic import of 'server-only', or any server-side Next.js APIs — this file must work in a static export client component.
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost/apps/web" && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>

  <acceptance_criteria>
    apps/web/lib/api/client.ts exists; npx tsc --noEmit from apps/web/ exits 0 with zero errors for client.ts; package.json dependencies contains "swr"; NEXT_PUBLIC_USE_MOCK string "true" causes apiFetch to read local mock data (verified manually by importing and calling with process.env set); NEXT_PUBLIC_USE_MOCK "false" causes apiFetch to call NEXT_PUBLIC_API_BASE_URL with Authorization header from getToken().
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: TypeScript interfaces for all Phase 1-2 API shapes and mock verification</name>
  <files>apps/web/lib/api/types.ts</files>

  <read_first>
    API_CONTRACT.md — read ALL sections (Auth, Wallets, Categories, Transactions, Goals, Allocation-suggestion, Dashboard) to extract every request and response field with exact names and types. Note: field names use Indonesian conventions per CLAUDE.md (id_pengguna, nama_goal, tipe_transaksi etc.); types are string (UUID), number (integer Rupiah), string (ISO date).
    apps/web/mocks/goals.json — verify field names match what you define in GoalResponse interface
    apps/web/mocks/allocation-suggestion.json — verify field names match AllocationSuggestionResponse interface
    apps/web/lib/api/client.ts — understand the generic T in apiFetch<T> to ensure interfaces are compatible
  </read_first>

  <action>
    Create apps/web/lib/api/types.ts with TypeScript interfaces covering Phase 1 and Phase 2 API shapes. Define all interfaces as exported named types. Do NOT use default exports. Follow the field naming from API_CONTRACT.md exactly — no renaming to camelCase (backend returns snake_case; keep it as-is in TypeScript types to match the wire format).

    Define these interfaces (grouped by domain):

    Auth types: RegisterRequest with fields nama (string), email (string), password (string). RegisterResponse with fields id_pengguna (string), nama (string), email (string), access_token (string). LoginRequest with fields email (string), password (string). LoginResponse with fields access_token (string), id_pengguna (string).

    Wallet types: Wallet with fields id_dompet (string), nama_dompet (string), saldo (number). WalletsResponse with field wallets as Wallet array. WalletCreateRequest with field nama_dompet (string). WalletUpdateRequest with field nama_dompet (string).

    Category types (for Phase 2 prep): Category with fields id_kategori (string), nama_kategori (string), tipe (string), flag_pemasukan (string or null), flag_pengeluaran (string or null). CategoriesResponse with field categories as Category array.

    Transaction types (Phase 2 prep): TransactionCreateRequest with fields tipe_transaksi (string), nominal (number), tanggal_transaksi (string), metode_input (string), dompet_id (string), kategori_id (string), catatan (string or null). Note: do NOT include a source field — the API contract forbids frontend from sending source. Transaction (response) with all of the above plus id_transaksi (string), source_label (string or null), created_at (string), allocation_suggestion_available (boolean).

    Goal types (Phase 2 prep): Goal with fields id_goal (string), nama_goal (string), nominal_target (number), nominal_terkumpul (number), deadline (string), skor_keinginan (number), skor_kepentingan (number), progress_pct (number), rank (number). GoalsResponse with field goals as Goal array.

    Allocation suggestion types: AlternativeGoal with fields goal_id (string), goal_name (string), rank (number). AllocationSuggestionResponse with fields has_active_goal (boolean), suggested_goal_id (string), suggested_goal_name (string), suggested_amount (number), suggested_pct (number), alternative_goals as AlternativeGoal array.

    Error type: ApiErrorBody with nested error object containing code (string) and message (string).

    After writing types.ts, verify the existing mock files are consistent with the interfaces:
    - apps/web/mocks/goals.json: check every field in the goals array matches GoalResponse fields and types (id_goal is a string not a number, rank is a number, etc.)
    - apps/web/mocks/allocation-suggestion.json: check has_active_goal is boolean, suggested_amount and suggested_pct are numbers, alternative_goals array has the right shape

    If any mock field name or type does not match the interface you defined, update the mock file to match the interface (the interface is derived from API_CONTRACT.md which is the single source of truth). Document any corrections made as a note in the plan summary.
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost/apps/web" && npx tsc --noEmit && echo "PASS: zero TypeScript errors"</automated>
  </verify>

  <acceptance_criteria>
    apps/web/lib/api/types.ts exports: RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, Wallet, WalletsResponse, WalletCreateRequest, WalletUpdateRequest, Goal, GoalsResponse, AllocationSuggestionResponse, ApiErrorBody, and transaction/category types for Phase 2 prep. npx tsc --noEmit exits 0 with zero TypeScript errors. TransactionCreateRequest does NOT contain a source field. goals.json and allocation-suggestion.json field names and types match the corresponding TypeScript interfaces without warnings.
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| NEXT_PUBLIC_USE_MOCK env var → client.ts | The toggle controls whether real API calls are made; leaking NEXT_PUBLIC_API_BASE_URL in source is acceptable (it's a public URL) |
| Mock JSON data → UI render | Mock data is static and trusted; no injection risk from local files |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-C-01 | Information Disclosure | API base URL and anon key in NEXT_PUBLIC_ vars exposed to client bundle | low | accept | NEXT_PUBLIC_API_BASE_URL is the public backend URL — intended to be known. NEXT_PUBLIC_SUPABASE_ANON_KEY is designed for public client use (Row Level Security protects data). SERVICE_ROLE_KEY must never appear in any NEXT_PUBLIC_ variable. |
| T-01-C-02 | Tampering | Mock data used in production (USE_MOCK accidentally true in production build) | medium | mitigate | In CI/CD and Render/Vercel builds, NEXT_PUBLIC_USE_MOCK must be set to false or unset. Document this in user_setup for the deployment step. The apiFetch function treats any value other than the string "true" as the real API path. |
| T-01-C-SC | Tampering | swr npm package supply chain | low | accept | swr is the official Vercel-maintained data fetching library (npmjs.com/package/swr; 2M+ weekly downloads; Vercel org publishes it); no known vulnerabilities. |
</threat_model>

<verification>
Overall phase checks for Track C:

1. npm run lint from apps/web/ passes (no ESLint errors in lib/api/)
2. npx tsc --noEmit from apps/web/ exits 0
3. apps/web/lib/api/client.ts exports apiFetch and apiMutate functions
4. apps/web/lib/api/types.ts exports at minimum: RegisterRequest, RegisterResponse, LoginResponse, Wallet, WalletsResponse, Goal, GoalsResponse, AllocationSuggestionResponse
5. grep -c '"source"' apps/web/lib/api/types.ts equals 0 (no source field in types)
6. apps/web/mocks/goals.json and allocation-suggestion.json match the TypeScript interface field names
</verification>

<success_criteria>
- apiFetch with NEXT_PUBLIC_USE_MOCK=true returns data without any network calls
- apiFetch with NEXT_PUBLIC_USE_MOCK=false calls NEXT_PUBLIC_API_BASE_URL and includes Authorization header
- TypeScript compiles with zero errors — all interfaces match API_CONTRACT.md shapes
- No source field appears anywhere in TransactionCreateRequest
- Existing mock stubs are verified correct against API contract
</success_criteria>

<output>
Create `.planning/phases/01-foundation/01-C-SUMMARY.md` when done
</output>
