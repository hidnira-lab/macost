---
phase: 01-foundation
plan: B
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/requirements.txt
  - backend/main.py
  - backend/routers/__init__.py
  - backend/routers/auth.py
  - backend/routers/wallets.py
  - backend/dependencies/__init__.py
  - backend/dependencies/auth.py
  - backend/models/__init__.py
  - backend/models/wallet.py
  - backend/core/__init__.py
  - backend/core/supabase.py
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - WALL-01
  - WALL-02
  - WALL-03
  - WALL-04
user_setup:
  - service: supabase
    why: "Database table creation and auth credentials for JWT verification"
    env_vars:
      - name: SUPABASE_URL
        source: "Supabase Dashboard -> Project Settings -> API -> Project URL"
      - name: SUPABASE_SERVICE_ROLE_KEY
        source: "Supabase Dashboard -> Project Settings -> API -> service_role secret key (NEVER expose to frontend)"
      - name: SUPABASE_JWT_SECRET
        source: "Supabase Dashboard -> Project Settings -> API -> JWT Settings -> JWT Secret"
    dashboard_config:
      - task: "Create dompet table via SQL Editor"
        location: "Supabase Dashboard -> SQL Editor"
        detail: "Run the SQL described in Task 3 action to create the dompet table with RLS policies"
      - task: "Set environment variables in Render.com"
        location: "Render.com -> Service -> Environment"
        detail: "Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET as environment variables before deploying"

must_haves:
  truths:
    - POST /api/auth/register with valid body returns 201 with id_pengguna, nama, email, and access_token matching API_CONTRACT.md shape
    - POST /api/auth/login with valid credentials returns 200 with access_token and id_pengguna; returns 423 with ACCOUNT_LOCKED code on repeated failures
    - GET /api/wallets without Authorization header returns 401; with valid Supabase JWT returns 200 with user's wallet list
    - POST /api/wallets creates a new wallet with saldo 0 and returns 201; PUT renames it; DELETE returns 204
    - CORSMiddleware allows tauri://localhost, https://tauri.localhost, http://localhost, http://localhost:3000
    - requirements.txt contains PyJWT and supabase; does NOT contain python-jose
  artifacts:
    - backend/requirements.txt with PyJWT>=2.9.0, supabase>=2.0.0, fastapi>=0.138.2, uvicorn>=0.49.0, pydantic>=2.13.0, python-dotenv>=1.0.0, python-multipart>=0.0.32
    - backend/dependencies/auth.py with JWTBearer class validating HS256 algorithm and audience=authenticated
    - backend/routers/auth.py with register and login endpoints matching API_CONTRACT.md section 1 exactly
    - backend/routers/wallets.py with GET/POST/PUT/DELETE endpoints all requiring JWTBearer
    - backend/core/supabase.py with get_supabase_admin() helper using SERVICE_ROLE_KEY
  key_links:
    - dependencies/auth.py JWTBearer Depends -> all /api/wallets/* handlers (missing = all wallet endpoints public)
    - SUPABASE_JWT_SECRET env var -> jwt.decode algorithm HS256 + audience=authenticated (wrong = 401 on every valid token)
    - backend/core/supabase.py get_supabase_admin() -> wallets CRUD (missing service key = 403 from Supabase on every DB call)
    - CORS allow_origins list -> Tauri WebView network calls (missing origin = CORS error on every API call from APK)
---

<objective>
Build the complete FastAPI backend foundation: project structure with routers/dependencies/models, CORS for Tauri origins, PyJWT-based JWT verification middleware, auth endpoints (register and login), and full wallet CRUD endpoints backed by Supabase.

Purpose: All frontend API calls require a working backend. JWT auth must work end-to-end so all 4 developers can validate integration. Wallet CRUD is the core Phase 1 data operation. This plan also cleans up the backend/venv git tracking issue that bloats the repository.

Output: FastAPI app running on uvicorn with auth and wallet endpoints; JWTBearer dependency protecting all /api/wallets/* routes; requirements.txt with PyJWT (NOT python-jose); backend deployable to Render.com.

Owner: Fertika — branch backend/foundation
</objective>

<execution_context>
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/hiday/WebstormProjects/Zephyra/macost/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@backend/main.py
@API_CONTRACT.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: FastAPI project structure, requirements, CORS, and housekeeping</name>
  <files>
    backend/requirements.txt,
    backend/main.py,
    backend/routers/__init__.py,
    backend/dependencies/__init__.py,
    backend/models/__init__.py,
    backend/core/__init__.py
  </files>

  <read_first>
    backend/main.py — existing 7-line scaffold; extend this file; do NOT recreate it from scratch
    .planning/research/STACK.md — section "Supporting Libraries — Backend" for PyJWT and supabase-py versions; section "Critical Configuration Steps #5" for the exact CORS origins list
    .planning/research/PITFALLS.md — Pitfall 13 (venv committed to git and .gitignore fix); Pitfall 6 (wrong JWT algorithm preamble — confirms PyJWT not python-jose)
    API_CONTRACT.md — preamble for error response format and CORS context
  </read_first>

  <action>
    Create backend/requirements.txt with these pinned dependencies: fastapi>=0.138.2, uvicorn[standard]>=0.49.0, PyJWT>=2.9.0 (this is the package name, NOT python-jose — python-jose is abandoned and broken on Python 3.10+), supabase>=2.0.0, pydantic>=2.13.0, python-multipart>=0.0.32, python-dotenv>=1.0.0. Do NOT include python-jose anywhere in this file.

    Fix the .gitignore issue (Pitfall 13): The project's .gitignore is malformed (the heredoc wrapper line was accidentally committed). Open the root .gitignore and ensure it contains backend/venv/ as an excluded path. If backend/venv/ is currently tracked by git, run git rm -r --cached backend/venv/ and commit. This prevents hundreds of MB of Python bytecode from being pushed to GitHub.

    Update backend/main.py to add these two things to the existing FastAPI app:
    First: import and add CORSMiddleware with allow_origins set to the list ["tauri://localhost", "https://tauri.localhost", "http://localhost", "http://localhost:3000"]. Set allow_credentials=True, allow_methods=["*"], allow_headers=["*"]. Place this BEFORE any router includes. The order matters — middleware must be registered before routes.
    Second: import and include the auth router at prefix /api/auth and the wallets router at prefix /api (both routers will be created in subsequent tasks). Add a GET /health endpoint returning {"status": "ok"} — this is the UptimeRobot ping target.

    Create empty __init__.py files in backend/routers/, backend/dependencies/, backend/models/, and backend/core/ to make them proper Python packages.

    Verify by installing requirements: pip install -r backend/requirements.txt (run inside backend/venv/ or a fresh venv). Confirm: python -c "import jwt; print(jwt.__version__)" outputs 2.x. Confirm: python -c "import fastapi; print(fastapi.__version__)" outputs 0.138.x.
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost/backend" && python -c "import jwt; v=jwt.__version__; assert v.startswith('2'), f'PyJWT must be 2.x, got {v}'; print('PyJWT OK:', v)"</automated>
  </verify>

  <acceptance_criteria>
    backend/requirements.txt exists and contains PyJWT (the string "PyJWT" must appear, "python-jose" must NOT appear); pip install -r requirements.txt completes without error; python -c "import jwt; import fastapi" exits 0; backend/main.py imports CORSMiddleware and registers it with the four Tauri-compatible origins; GET /health returns {"status": "ok"}.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Auth endpoints with JWTBearer (register and login via Supabase)</name>
  <files>
    backend/dependencies/auth.py,
    backend/routers/auth.py,
    backend/core/supabase.py
  </files>

  <read_first>
    API_CONTRACT.md — section "1. Auth": exact field names for register request (nama, email, password), register response (id_pengguna, nama, email, access_token), login request (email, password), login response (access_token, id_pengguna), and the 423 ACCOUNT_LOCKED error shape
    .planning/research/STACK.md — section "Critical Configuration Steps #4" for the PyJWT JWTBearer pattern with HS256 and audience="authenticated"
    .planning/research/PITFALLS.md — Pitfall 6 (wrong algorithm RS256 vs HS256; missing audience claim; these are show-stoppers)
  </read_first>

  <action>
    Create backend/core/supabase.py with a get_supabase_admin() function that creates and returns a supabase-py v2 client using os.environ["SUPABASE_URL"] and os.environ["SUPABASE_SERVICE_ROLE_KEY"]. The service role key bypasses Supabase RLS, which is correct here because FastAPI is the trusted layer enforcing user-scoped access. Import create_client from supabase. Cache the client at module level to avoid recreating it per request.

    Create backend/dependencies/auth.py with a JWTBearer class (inheriting from HTTPBearer) and a get_current_user_id dependency function. The dependency function must:
    1. Extract the token from credentials.credentials (the raw JWT string from Authorization: Bearer header)
    2. Call jwt.decode(token, os.environ["SUPABASE_JWT_SECRET"], algorithms=["HS256"], audience="authenticated") — algorithm MUST be HS256 (not RS256); audience MUST be "authenticated" (Supabase always sets this claim)
    3. On jwt.ExpiredSignatureError: raise HTTPException(status_code=401, detail={"error": {"code": "TOKEN_EXPIRED", "message": "Token sudah kadaluarsa"}})
    4. On jwt.PyJWTError: raise HTTPException(status_code=401, detail={"error": {"code": "UNAUTHORIZED", "message": "Token tidak valid"}})
    5. Return payload["sub"] as a string — this is the Supabase user UUID and will be used as the filter key in all data queries.

    Create backend/routers/auth.py with two endpoints:

    POST /register: Accept a Pydantic model with fields nama (str), email (str), password (str). Call supabase.auth.admin.create_user({"email": email, "password": password, "email_confirm": True, "user_metadata": {"nama": nama}}) using the admin client from get_supabase_admin(). Then call supabase.auth.sign_in_with_password({"email": email, "password": password}) on the ANON-key client (not admin) to obtain the access_token — the admin API does not issue tokens directly. Return HTTP 201 with a JSON body matching the API_CONTRACT.md register response shape exactly: {"id_pengguna": user_id_string, "nama": nama, "email": email, "access_token": access_token_string}. On AuthApiError with "User already registered": return HTTP 400 with {"error": {"code": "EMAIL_TAKEN", "message": "Email sudah digunakan"}}.

    POST /login: Accept a Pydantic model with fields email (str), password (str). Call supabase.auth.sign_in_with_password({"email": email, "password": password}) using an ANON-key client (os.environ["SUPABASE_ANON_KEY"]). Return HTTP 200 with {"access_token": session.access_token, "id_pengguna": user.id}. On AuthApiError indicating wrong credentials: return HTTP 401 with {"error": {"code": "INVALID_CREDENTIALS", "message": "Email atau password salah"}}. On AuthApiError indicating account locked (Supabase raises this after 5 failed attempts): return HTTP 423 with {"error": {"code": "ACCOUNT_LOCKED", "message": "Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit."}}.

    Note: No logout endpoint on FastAPI is needed — logout is handled client-side by clearing the token from session storage (Track D). Supabase JWTs are stateless; token invalidation would require Supabase's revoke API which is overkill for MVP.

    Add SUPABASE_ANON_KEY to the required environment variables (used for sign_in_with_password on the client side of auth calls).
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost" && python -c "from backend.dependencies.auth import get_current_user_id; print('JWTBearer OK')"</automated>
  </verify>

  <acceptance_criteria>
    backend/dependencies/auth.py imports jwt from PyJWT (import jwt) and calls jwt.decode with algorithms=["HS256"] and audience="authenticated"; backend/routers/auth.py has both /register and /login handlers; running uvicorn backend.main:app --reload starts without ImportError; POST /api/auth/login with a nonexistent email returns 401 with a JSON error body matching the API contract error shape; no python-jose import anywhere in the backend/ directory.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Wallet CRUD endpoints with Supabase and user-scoped data access</name>
  <files>
    backend/routers/wallets.py,
    backend/models/wallet.py
  </files>

  <read_first>
    API_CONTRACT.md — section "2. Wallets / Dompet": exact response shapes for GET (wallets array with id_dompet, nama_dompet, saldo), POST (201 with wallet object), PUT (200 with updated wallet), DELETE (204 no content)
    backend/routers/auth.py — follow the same router structure and Pydantic model pattern
    backend/dependencies/auth.py — import get_current_user_id as Depends to protect every wallet endpoint
    backend/core/supabase.py — use get_supabase_admin() for all Supabase table operations
  </read_first>

  <action>
    Create the dompet table in Supabase. Via the Supabase Dashboard SQL Editor, run SQL that creates a table named dompet with these columns: id_dompet as UUID primary key with gen_random_uuid() default, id_pengguna as UUID not null (foreign key referencing auth.users id), nama_dompet as TEXT not null, saldo as INTEGER not null default 0, created_at as TIMESTAMPTZ default now(). Enable row-level security on the table. Create four RLS policies — SELECT WHERE auth.uid() = id_pengguna; INSERT WITH CHECK auth.uid() = id_pengguna; UPDATE USING auth.uid() = id_pengguna; DELETE USING auth.uid() = id_pengguna. These RLS policies provide defense-in-depth; FastAPI also filters by user_id manually.

    Create backend/models/wallet.py with three Pydantic BaseModel subclasses:
    WalletCreate with a single field nama_dompet of type str.
    WalletUpdate with a single field nama_dompet of type str.
    WalletResponse with fields id_dompet (str), nama_dompet (str), saldo (int).

    Create backend/routers/wallets.py with four endpoints, ALL of which inject current_user_id: str = Depends(get_current_user_id) to ensure JWT authentication:

    GET /wallets: Call supabase.table("dompet").select("*").eq("id_pengguna", current_user_id).execute(). Map each row to a WalletResponse. Return {"wallets": [list of WalletResponse]}.

    POST /wallets: Accept WalletCreate body. Call supabase.table("dompet").insert({"id_pengguna": current_user_id, "nama_dompet": body.nama_dompet, "saldo": 0}).execute(). Return HTTP 201 with the created WalletResponse (id_dompet, nama_dompet, saldo=0).

    PUT /wallets/{wallet_id}: Accept WalletUpdate body. Call supabase.table("dompet").update({"nama_dompet": body.nama_dompet}).eq("id_dompet", wallet_id).eq("id_pengguna", current_user_id).execute(). The double .eq() ensures users cannot rename another user's wallet even if they know the UUID. If data returns empty (wallet not found or not owned), return HTTP 404 with {"error": {"code": "NOT_FOUND", "message": "Dompet tidak ditemukan"}}.

    DELETE /wallets/{wallet_id}: Call supabase.table("dompet").delete().eq("id_dompet", wallet_id).eq("id_pengguna", current_user_id).execute(). Return HTTP 204 with no body. If the wallet does not exist or belongs to a different user, the delete is a no-op (Supabase returns an empty result); return 204 regardless to avoid information disclosure.

    Include this router in backend/main.py at prefix /api (so the full path is /api/wallets as per API_CONTRACT.md).

    Error format for all errors must follow the API_CONTRACT.md shape: {"error": {"code": "STRING", "message": "Human-readable string"}}.
  </action>

  <verify>
    <automated>cd "C:/Users/hiday/WebstormProjects/Zephyra/macost" && python -c "from backend.routers.wallets import router; from backend.models.wallet import WalletResponse; print('Wallet router OK')"</automated>
  </verify>

  <acceptance_criteria>
    GET /api/wallets without Authorization header returns 401 (JWTBearer blocks); backend/models/wallet.py exports WalletCreate, WalletUpdate, WalletResponse; backend/routers/wallets.py has four route handlers; every wallet handler uses Depends(get_current_user_id); all four routes are at /api/wallets path per API_CONTRACT.md. Running uvicorn and making requests with a valid Supabase JWT: GET returns wallet list, POST creates wallet with saldo=0, PUT renames it, DELETE returns 204.
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| HTTP request → FastAPI | All client requests cross the public internet; JWT must be validated on every protected request |
| FastAPI → Supabase | Backend uses SERVICE_ROLE_KEY; RLS provides defense-in-depth but FastAPI must also filter by user_id |
| Environment variables → runtime | SUPABASE_JWT_SECRET and SUPABASE_SERVICE_ROLE_KEY are catastrophic if leaked; must be server-side only |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-B-01 | Spoofing | JWT signature verification in JWTBearer | critical | mitigate | Use PyJWT jwt.decode with algorithms=["HS256"] (not RS256) and audience="authenticated"; both checks mandatory per Pitfall 6 |
| T-01-B-02 | Information Disclosure | Cross-user wallet data via missing user_id filter | high | mitigate | Every Supabase query chains .eq("id_pengguna", current_user_id); defense-in-depth from Supabase RLS policies |
| T-01-B-03 | Elevation of Privilege | SUPABASE_SERVICE_ROLE_KEY exposed in logs or response bodies | critical | mitigate | Key only used in backend/core/supabase.py; never returned in any response body; not logged anywhere |
| T-01-B-04 | Information Disclosure | Email enumeration via register endpoint (reveals if email is taken) | low | accept | Returns EMAIL_TAKEN code on duplicate; acceptable UX trade-off for student project demo scope |
| T-01-B-05 | Denial of Service | CORS wildcard would allow cross-origin attacks | medium | mitigate | allow_origins list is explicit (4 origins); no wildcard per PITFALLS.md security section |
| T-01-B-SC | Tampering | pip install of PyJWT and supabase-py supply chain | high | mitigate | PyJWT is the official maintained JWT library (pypi.org/project/PyJWT — 200M+ downloads); supabase-py is the official Supabase Python SDK; pin minimum versions in requirements.txt |
</threat_model>

<verification>
Overall phase checks for Track B:

1. python -c "import jwt; assert not hasattr(jwt, 'JWTError'), 'python-jose installed instead of PyJWT'" passes
2. uvicorn backend.main:app starts without ImportError
3. GET http://localhost:8000/ returns {"status": "Macost backend running"}
4. GET http://localhost:8000/health returns {"status": "ok"}
5. POST /api/auth/login with wrong credentials returns 401 with error JSON body
6. GET /api/wallets without token returns 401
7. git ls-files backend/venv/ returns no output (venv not tracked)
</verification>

<success_criteria>
- All 8 Phase 1 requirements implemented on the backend: AUTH-01 (register), AUTH-02 (JWT persisted from login response), AUTH-03 (logout is client-side clear), AUTH-04 (JWTBearer on all /api/wallets/* routes), WALL-01 through WALL-04 (full CRUD)
- requirements.txt contains PyJWT; does NOT contain python-jose
- All wallet endpoints filter by current_user_id from the JWT payload
- CORS allows all four Tauri-compatible origins
- backend/venv/ is not tracked by git
</success_criteria>

<output>
Create `.planning/phases/01-foundation/01-B-SUMMARY.md` when done
</output>
