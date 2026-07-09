# Phase 3: Differentiators - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 26 (new/modified, backend + frontend)
**Analogs found:** 24 / 26

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/core/gemini_client.py` | config/client-factory | request-response | `backend/dependencies/auth.py` (`_get_jwks_client` module-level cache pattern) | role-match |
| `backend/services/gemini_service.py` | service | streaming/external-call | `backend/services/saw_engine.py` (pure functions, no IO) — structurally different (this one IS the IO), so also cross-ref `backend/dependencies/auth.py` for external-call+exception pattern | partial |
| `backend/models/receipt.py` | model (Pydantic schema) | transform | `backend/models/transaction.py` | role-match |
| `backend/models/statement.py` | model (Pydantic schema) | transform | `backend/models/transaction.py` | role-match |
| `backend/models/insight.py` | model (Pydantic schema, cross-field validator) | transform | `backend/models/goal_settings.py` (`field_validator` sum-tolerance pattern) | exact |
| `backend/routers/transactions.py` (EXTEND: scan-receipt, upload-statement, import-batch) | controller/route | file-I/O + CRUD | `backend/routers/transactions.py` (existing `create_transaction`, IDOR-safe `list_transactions`) | exact (same file) |
| `backend/services/statement_service.py` | service | CRUD (duplicate-detection query) | `backend/routers/transactions.py::list_transactions` (query-scoping-by-user pattern) | role-match |
| `backend/routers/ai_insight.py` | controller/route | request-response (LLM-backed) | `backend/routers/goal_settings.py` (get-or-create + structured-error pattern) | role-match |
| `backend/services/insight_service.py` | service | aggregate + external-call | `backend/services/goal_settings_service.py` (get-or-create-default shape) + `saw_engine.py` (aggregation-then-score shape) | role-match |
| `backend/routers/goal_settings.py` (EXTEND: preview-rank endpoint) | controller/route | request-response | `backend/routers/goal_settings.py` (existing PUT handler — same file) | exact (same file) |
| `apps/web/app/transactions/scan/page.tsx` | page/component | file-I/O (upload) + request-response | `apps/web/components/TransactionForm.tsx` (form + apiMutate submit pattern) | role-match |
| `apps/web/app/transactions/import/page.tsx` | page/component | file-I/O (upload) + batch CRUD | `apps/web/components/TransactionForm.tsx` (data-fetch + submit) + `apps/web/components/SmartAllocationModal.tsx` (review/confirm-before-commit UX) | role-match |
| `apps/web/app/ai/page.tsx` (EXTEND — wire to API) | page/component | request-response | `apps/web/app/home/page.tsx` (existing `apiFetch` + loading/error state pattern) | exact |
| `apps/web/app/goal-settings/page.tsx` (or extend goals settings surface) | page/component | request-response (live preview) | `apps/web/components/TransactionForm.tsx` (controlled-input form state pattern) | role-match |
| `apps/web/app/home/page.tsx` (EXTEND — mount QAP) | page/component | request-response (reuse existing fetch) | `apps/web/app/home/page.tsx` (same file, existing bento-quick-actions section) | exact (same file) |
| `apps/web/components/QuickAccessPanel.tsx` | component | transform (pure UI over passed props) | `apps/web/app/home/page.tsx` (existing "Quick Actions (bento)" `<section>` — lines 230-258) | exact |
| `apps/web/components/ReceiptReviewForm.tsx` | component (editable review form) | CRUD (review-then-submit) | `apps/web/components/TransactionForm.tsx` | exact |
| `apps/web/components/StatementReviewTable.tsx` | component (checkbox review table) | batch CRUD | `apps/web/components/SmartAllocationModal.tsx` (confirm/skip + apiMutate pattern) | role-match |
| `apps/web/components/InsightCard.tsx` | component (display card) | transform | `apps/web/app/ai/page.tsx` (existing static "AI Insights Card" — lines 30-68) | exact |
| `apps/web/components/SawWeightEditor.tsx` | component (numeric form + live preview) | request-response | `apps/web/components/TransactionForm.tsx` (controlled numeric input pattern, `parseRpInput`/`formatRpInput`) | role-match |
| `apps/web/lib/api/client.ts` (EXTEND — new mock resolvers + multipart support) | utility (API client) | request-response | `apps/web/lib/api/client.ts` (same file, existing `resolveMock`/`apiMutate`) | exact (same file) |
| `apps/web/mocks/scan-receipt.json` | mock data | static fixture | `apps/web/mocks/allocation-suggestion.json` | role-match |
| `apps/web/mocks/upload-statement.json` | mock data | static fixture | `apps/web/mocks/transactions.json` | role-match |
| `apps/web/mocks/ai-insight.json` | mock data | static fixture | `apps/web/mocks/dashboard.json` | role-match |
| `backend/tests/test_gemini_service.py` | test | unit (mocked external call) | `backend/tests/test_transactions.py` (isolated `TestClient` + `monkeypatch` pattern) | role-match |
| `backend/tests/test_statement_service.py` / `test_insight_service.py` | test | unit | `backend/tests/test_transactions.py` + `backend/tests/conftest.py` (`FakeSupabaseClient`) | exact |

## Pattern Assignments

### `backend/core/gemini_client.py` (config, request-response)

**Analog:** `backend/dependencies/auth.py`

**Module-level cached client pattern** (lines 7-20):
```python
_bearer_scheme = HTTPBearer()
_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    """Cached at module level ... avoids re-fetching on every request."""
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.environ["SUPABASE_URL"]
        _jwks_client = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")
    return _jwks_client
```
**Apply to `gemini_client.py`:** Same lazy-singleton shape — read `AI_VISION_API_KEY` from `os.environ`, construct `genai.Client(api_key=...)` once at module level, expose a `get_gemini_client()` accessor. Do not construct a new client per-request.

---

### `backend/services/gemini_service.py` (service, external-call)

**Analog:** `backend/dependencies/auth.py`'s exception-mapping pattern + RESEARCH.md Pattern 2 (already-verified against primary SDK source)

**Error handling pattern** (auth.py lines 41-59, structurally reused for the "map external-call failure to a safe fallback" shape):
```python
try:
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(...)
    return str(payload["sub"])
except jwt.ExpiredSignatureError:
    raise HTTPException(..., detail={"error": {"code": "TOKEN_EXPIRED", ...}})
except jwt.PyJWTError:
    raise HTTPException(..., detail={"error": {"code": "UNAUTHORIZED", ...}})
```
**Apply to `gemini_service.py`:** Same broad-except-to-safe-fallback shape, but per RESEARCH.md Pattern 2/Pitfall 2, wrap the **async** client call in `asyncio.wait_for(...)` and catch broadly (any Gemini failure — timeout, malformed response, rate limit — must fall to the SAME `None`/fallback return, never a differentiated retry):
```python
async def extract_receipt(image_bytes: bytes, mime_type: str) -> ReceiptExtraction | None:
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[PROMPT, types.Part.from_bytes(data=image_bytes, mime_type=mime_type)],
                config={"response_mime_type": "application/json", "response_schema": ReceiptExtraction},
            ),
            timeout=10.0,
        )
    except Exception:
        return None  # no auto-retry (CLAUDE.md, D-01)
    return ReceiptExtraction.model_validate_json(response.text)
```
This exact code is already vetted in `03-RESEARCH.md` "Pattern 2" / "Code Examples" — copy verbatim, only varying `timeout=` (10.0 for scan, 15.0 for insight, 15-20 for statement per Open Question #1) and the Pydantic schema.

---

### `backend/models/receipt.py`, `backend/models/statement.py` (model, transform)

**Analog:** `backend/models/transaction.py`

**Field-declaration pattern** (lines 1-19):
```python
from datetime import date
from pydantic import BaseModel, Field

class TransactionCreate(BaseModel):
    nominal: int = Field(gt=0)
    tanggal_transaksi: date
    metode_input: str = "Manual"
    dompet_id: str
    kategori_id: str
    catatan: str | None = None
```
**Apply to `ReceiptExtraction`/`StatementTransaction`:** Same `Field(gt=0)` guard on `nominal`, same `date`/ISO-string typing convention, same nullable-optional pattern (`items: list[str] | None = None`). This also becomes the Gemini `response_schema` (per RESEARCH.md Pattern 1) — no separate DTO needed.

---

### `backend/models/insight.py` (model, cross-field validator)

**Analog:** `backend/models/goal_settings.py`

**`field_validator`/tolerance-check pattern** (lines 24-48):
```python
class GoalSettingsUpdate(BaseModel):
    strategy: Literal["quick_win", "importance_first"]
    weights: GoalSettingsWeights

    @field_validator("weights")
    @classmethod
    def validate_weight_sum(cls, v: GoalSettingsWeights) -> GoalSettingsWeights:
        if abs(sum(v.model_dump().values()) - 1.0) >= 0.002:
            raise ValueError("weights must sum to 1.0")
        return v
```
**Apply to `InsightItem`:** Use Pydantic v2 `model_validator(mode="after")` (per RESEARCH.md Pitfall 4 / Code Examples) for the `related_goal_id`/`related_category_id` "at least one non-null" invariant — same "raise `ValueError`, let the router 400" philosophy as this analog:
```python
class InsightItem(BaseModel):
    action_verb: Literal["Alokasikan", "Kurangi", "Pertimbangkan"]
    related_goal_id: str | None = None
    related_category_id: str | None = None

    @model_validator(mode="after")
    def require_one_related_target(self):
        if self.related_goal_id is None and self.related_category_id is None:
            raise ValueError("insight must link to a goal or category")
        return self
```
Also copy `GoalSettingsWeights`'s `model_config = ConfigDict(extra="forbid")` idiom if the insight schema should reject unexpected LLM output keys.

---

### `backend/routers/transactions.py` — EXTEND with scan-receipt/upload-statement/import-batch

**Analog:** same file, existing `create_transaction` (lines 37-107) and `list_transactions` (lines 114-159)

**Auth + user-scoping pattern** (lines 40-41, 122):
```python
def create_transaction(
    body: TransactionCreate,
    current_user_id: str = Depends(get_current_user_id),
):
```
**404/structured-error pattern** (lines 56-65):
```python
if not kategori_rows:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Kategori tidak ditemukan"}},
    )
```
**Apply to new routes:** Reuse `Depends(get_current_user_id)` verbatim on `scan-receipt`, `upload-statement`, `import-batch`. Multipart upload validation combines this file's `HTTPException` structured-error shape with RESEARCH.md's `Code Examples` "FastAPI multipart upload with size/type guard" (magic-number check before `400 VALIDATION_ERROR`). Batch import should reuse `list_transactions`'s **always double-scope-by-`id_pengguna`** IDOR pattern (lines 129-133) for the duplicate-detection query.

---

### `backend/services/statement_service.py` (service, CRUD/duplicate-detection)

**Analog:** `backend/routers/transactions.py::list_transactions` query-scoping (lines 128-144)

**Query pattern to copy:**
```python
query = (
    supabase.table("transaksi")
    .select("*")
    .eq("id_pengguna", current_user_id)
)
```
**Apply to duplicate detection (D-02):** Per RESEARCH.md's "Duplicate-detection query" Code Example — scope to `id_pengguna` only (Pitfall 5 resolution: wallet is not known until final import), then build a `(tanggal_transaksi, nominal)` set:
```python
existing = (
    supabase.table("transaksi")
    .select("tanggal_transaksi,nominal")
    .eq("id_pengguna", current_user_id)
    .execute()
    .data
)
existing_keys = {(row["tanggal_transaksi"], row["nominal"]) for row in existing}
for tx in extracted_transactions:
    tx["is_possible_duplicate"] = (tx["tanggal_transaksi"], tx["nominal"]) in existing_keys
```

---

### `backend/routers/ai_insight.py` (controller, request-response)

**Analog:** `backend/routers/goal_settings.py`

**Get-or-create + structured-400 pattern** (lines 16-19, 41-52):
```python
@router.get("/goal-settings", response_model=dict)
def get_goal_settings(current_user_id: str = Depends(get_current_user_id)):
    row = get_or_create_goal_settings(current_user_id)
    return {"strategy": row["strategy"], "weights": row["weights"]}
```
**Apply to `GET /api/ai-insight`:** Same one-liner delegation-to-service shape. On Gemini timeout/failure (service returns `None`), the router returns `{"insight_available": False, "fallback_message": "..."}` instead of raising — mirroring how `create_transaction`'s server-derivation never surfaces a raw exception to the client, always a structured shape.

---

### `backend/services/insight_service.py` (service, aggregate + external-call)

**Analog:** `backend/services/goal_settings_service.py` (get-or-create shape) + `backend/services/saw_engine.py` (aggregate-then-score/rank shape, lines 94-173)

**Aggregation-before-computation pattern** (`saw_engine.py` lines 138-168 — gather raw values per criterion, THEN score):
```python
criteria = [...]
normalized: dict[str, list[float]] = {}
for criterion in criteria:
    raw_values = _raw_criterion_values(goals, criterion)
    ...
scored = []
for i, goal in enumerate(goals):
    score = sum(...)
    scored.append((score, goal))
```
**Apply to `insight_service.py`:** Aggregate the user's transactions + goals (scoped by `id_pengguna`, same as `goal_settings_service.get_or_create_goal_settings`'s `.eq("id_pengguna", user_id)`), assemble an LLM prompt from the aggregate, THEN call `gemini_service.generate_insight()` — do not interleave DB reads with the LLM call.

---

### `backend/routers/goal_settings.py` — EXTEND with preview-rank endpoint

**Analog:** same file, existing `update_goal_settings` (lines 26-67)

**Reuse-existing-validated-model + structured-error pattern** (lines 41-52):
```python
try:
    validated = GoalSettingsUpdate(**body)
except ValidationError:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error": {"code": "VALIDATION_ERROR", "message": "weights must sum to 1.0"}},
    )
```
**Apply to `POST /api/goal-settings/preview`:** Reuse `GoalSettingsUpdate` for the request body (same ±0.002-tolerance validator applies to the live-preview candidate weights), then call `saw_engine.rank_goals(goals, body.weights.model_dump(), body.strategy)` per RESEARCH.md Pattern 3 — do not reimplement scoring in the router or in TypeScript.

---

### `apps/web/components/ReceiptReviewForm.tsx` (component, review-then-submit)

**Analog:** `apps/web/components/TransactionForm.tsx`

**Controlled-form + submit pattern** (lines 37-124):
```tsx
const [nominal, setNominal] = useState(initialValues?.nominal ?? 0)
...
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (nominal <= 0) { setError('Nominal harus lebih dari 0.'); return }
  ...
  setSubmitting(true)
  try {
    const payload: TransactionCreateRequest = { ... }
    await onSubmit(payload)
  } catch {
    setError('Gagal menyimpan transaksi. Coba lagi.')
  } finally {
    setSubmitting(false)
  }
}
```
**Rp-formatting helpers to reuse verbatim** (lines 28-35):
```tsx
function formatRpInput(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID')
}
function parseRpInput(value: string): number {
  return Number(value.replace(/[^0-9]/g, '')) || 0
}
```
**Apply:** `ReceiptReviewForm` pre-fills these same controlled fields from `POST /transactions/scan-receipt`'s `extracted` payload, lets the user correct any field, and calls the SAME `onSubmit` contract (parent owns `apiMutate` to `POST /api/transactions` — per SCAN-02, never auto-saved, always routed through this existing create-transaction flow). The `initialValues` prop shape already supports this (`Partial<TransactionCreateRequest>`).

---

### `apps/web/components/StatementReviewTable.tsx` (component, batch review/confirm)

**Analog:** `apps/web/components/SmartAllocationModal.tsx`

**Confirm/skip async-action pattern** (lines 150-189):
```tsx
async function handleConfirm() {
  ...
  setConfirming(true)
  setError(null)
  try {
    const body: AllocationConfirmRequest = { ... }
    await apiMutate<AllocationConfirmResponse>('/api/allocations', 'POST', body)
    onConfirmed()
  } catch {
    setError('Gagal mengonfirmasi alokasi. Coba lagi.')
  } finally {
    setConfirming(false)
  }
}
```
**Apply:** Row-level checkbox state (default-checked, except `is_possible_duplicate: true` rows default-unchecked per D-02), single "Confirm import" action calling `apiMutate('/api/transactions/import-batch', 'POST', { transactions: selectedRows })`, same try/catch/finally + Bahasa error-message shape as this analog. The "no active goal" branch (lines 79-134) is a useful reference for a similarly-styled empty/degenerate state if `extracted_transactions` is empty.

---

### `apps/web/app/ai/page.tsx` — EXTEND to wire to `GET /api/ai-insight`

**Analog:** `apps/web/app/home/page.tsx` (existing `apiFetch` + loading/error pattern, lines 140-189) — the target file itself is currently a static shell (lines 1-113) that establishes header/chrome only.

**Data-fetch + auth-redirect pattern to copy** (`home/page.tsx` lines 140-177):
```tsx
const loadHome = useCallback(async () => {
  try {
    const [dashboard, ...] = await Promise.all([apiFetch<DashboardResponse>(...), ...])
    ...
  } catch (err) {
    if (isAuthError(err)) { router.push('/login'); return }
    setError('Gagal memuat halaman utama')
  } finally {
    setLoading(false)
  }
}, [router])

useEffect(() => {
  async function init() {
    if (!USE_MOCK) {
      const token = await getToken()
      if (!token) { router.push('/login'); return }
    }
    await loadHome()
  }
  init()
}, [router, loadHome])
```
**Existing chrome to keep as-is** (`ai/page.tsx` lines 1-27, header/nav) — replace only the two hardcoded `<div>` cards (lines 30-107) with `InsightCard` components mapped over the fetched `insights[]`, plus a "Perbarui insight" refresh button (D-04) that re-calls the same `loadInsights()` function on click.

---

### `apps/web/components/InsightCard.tsx` (component, display)

**Analog:** `apps/web/app/ai/page.tsx`'s existing "AI Insights Card" markup (lines 30-68)

**Card shell to extract into a reusable component:**
```tsx
<div className="rounded-xl overflow-hidden mb-5 mt-4 cursor-pointer transition-shadow hover:shadow-md"
     style={{ backgroundColor: '#ffffff', border: '1px solid rgba(30,30,30,0.15)' }}>
  <div className="px-4 pt-4 pb-4">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
           style={{ backgroundColor: 'rgba(41,141,255,0.1)' }}>
        <Sparkles className="w-5 h-5" style={{ color: '#298dff' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold" style={{ fontFamily: "'Neulis', sans-serif", color: '#1e1e1e' }}>...</p>
        <p className="text-sm mt-0.5" style={{ fontFamily: 'Helvetica, sans-serif', color: 'rgba(30,30,30,0.65)' }}>...</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 mt-2" style={{ color: 'rgba(30,30,30,0.3)' }} />
    </div>
  </div>
</div>
```
**Apply:** Parametrize this exact shell per insight — swap the static title/subtitle for `insight.message`, add an `action_verb` badge, and route `onClick` to `/goals` or a category view depending on whether `related_goal_id`/`related_category_id` is set (per Pitfall 4, both should never be null server-side, but the UI should still defensively handle it per UI-SPEC.md's "no chevron" degenerate case).

---

### `apps/web/components/QuickAccessPanel.tsx` (component, composition-only)

**Analog:** `apps/web/app/home/page.tsx`'s existing "Quick Actions (bento)" section (lines 230-258)

**Bento-button pattern to reuse:**
```tsx
<button
  onClick={() => router.push('/transactions')}
  className="flex h-32 flex-col items-start justify-between rounded-xl p-4 text-left shadow-[0_4px_4px_0_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90"
  style={{ background: 'linear-gradient(135deg, #298dff, #065fc5)' }}
>
  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] backdrop-blur-sm">
    <Plus className="h-4 w-4 text-white" />
  </span>
  <span>
    <span className="font-display block text-xl font-semibold text-[#fcfcfc]">Tambah</span>
    <span className="font-body block text-xs font-bold text-[rgba(255,255,255,0.65)]">Transaksi</span>
  </span>
</button>
```
**Apply:** `QuickAccessPanel` takes `goals: Goal[]` and `remainingBudget: number` as props (already fetched by the parent Home page per D-06 — no new fetch inside this component), renders exactly 4 shortcuts: (1) add transaction — reuse the button above verbatim, (2) scan receipt — currently a `disabled` "Segera hadir" button at lines 245-257, **enable it** and route to `/transactions/scan`, (3) top active goal (name + `progress_pct`) — derive from `goals` sorted/filtered by `rank === 1` (SAW rank-1, matches the existing `goalVisual()` helper's rotation-by-index styling), (4) balance summary — reuse the "Sisa Anggaran" `<section>` (lines 220-228) styling in compact form. Mount this component at the very top of `home/page.tsx`, above the existing top app bar's content area, reusing `dashboard`/`goals` state already in `HomePage`'s `useState`.

---

### `apps/web/lib/api/client.ts` — EXTEND with new mock resolvers

**Analog:** same file, existing `resolveMock()` (lines 49-98)

**Mock-routing pattern to extend:**
```tsx
if (path === "/api/goal-settings") return goalSettingsData;
if (path === "/api/allocations/pending") return allocationsPendingData;
```
**Apply:** Add `if (path === "/api/ai-insight") return aiInsightData;` and similar exact-match branches for any new GET paths. `scan-receipt`/`upload-statement`/`import-batch` are POST-only (multipart), so they go through `apiMutate` (mock mode "does NOT apply" per this file's own doc comment, lines 187-191) — during mock-first frontend dev (per CONTEXT.md's Reusable Assets note), these calls should be short-circuited at the call-site (component-level `if (USE_MOCK)` branch reading a static import), NOT inside `apiMutate` itself, to avoid violating this file's "mutations always go to the real backend" contract. `apiMutate` itself may need a new multipart-aware sibling function (e.g. `apiUpload`) since it currently hardcodes `"Content-Type": "application/json"` (line 210) and JSON-serializes the body (line 217) — multipart `FormData` uploads must omit the `Content-Type` header entirely (browser sets the boundary) and pass `FormData` as `body` directly.

---

## Shared Patterns

### Authentication (backend)
**Source:** `backend/dependencies/auth.py`
**Apply to:** All 3 new backend routes (`scan-receipt`, `upload-statement`, `ai-insight`) and the goal-settings preview endpoint
```python
current_user_id: str = Depends(get_current_user_id)
```
Reuse verbatim — no new auth mechanism needed.

### Structured error responses (backend)
**Source:** `backend/routers/transactions.py` lines 56-65, `backend/routers/goal_settings.py` lines 41-52
**Apply to:** All new routes — every 4xx must use `{"error": {"code": "...", "message": "..."}}`, never a bare string or default FastAPI 422.

### IDOR-safe user scoping (backend)
**Source:** `backend/routers/transactions.py::list_transactions` (double/consistent `.eq("id_pengguna", current_user_id)`)
**Apply to:** `statement_service.py`'s duplicate-detection query and `insight_service.py`'s transaction/goal aggregation — never trust a client-supplied user id, always scope from `current_user_id`.

### Never-auto-execute / suggest-then-confirm (backend + frontend)
**Source:** `apps/web/components/SmartAllocationModal.tsx` (confirm/skip two-step) + `backend/routers/transactions.py::create_transaction` (`allocation_suggestion_available` flag, never auto-creates an allocation)
**Apply to:** `ReceiptReviewForm` (SCAN-02 — extraction result staged, `onSubmit` only fires on explicit user action) and `StatementReviewTable` (ESTAT-02 — batch import only on explicit "Confirm" click, never on upload-complete).

### apiFetch/apiMutate mock-aware client (frontend)
**Source:** `apps/web/lib/api/client.ts`
**Apply to:** All new pages/components — `apiFetch<T>()` for GET (mock-able), `apiMutate<T>()` for POST/PUT/DELETE (always real API, needs a new multipart variant for file uploads).

### Bahasa Indonesia error copy tone (frontend)
**Source:** `apps/web/components/TransactionForm.tsx` ("Gagal menyimpan transaksi. Coba lagi."), `apps/web/components/SmartAllocationModal.tsx` ("Gagal mengonfirmasi alokasi. Coba lagi.")
**Apply to:** All new error/fallback copy — short, past-tense "Gagal ... Coba lagi." pattern; consult UI-SPEC.md for any feature-specific locked copy (per CONTEXT.md, UI-SPEC copy takes precedence over ad-hoc rederivation).

### Test isolation pattern (backend tests)
**Source:** `backend/tests/test_transactions.py` (isolated `TestClient` + `app.dependency_overrides[...get_current_user_id] = lambda: user_id`) + `backend/tests/conftest.py`'s `FakeSupabaseClient`
**Apply to:** `test_gemini_service.py`, `test_statement_service.py`, `test_insight_service.py` — build isolated `FastAPI()` + single router, override auth dependency, seed `FakeSupabaseClient`, and additionally `monkeypatch` the Gemini client call (new `conftest.py` fixture, e.g. `fake_gemini_response`, per RESEARCH.md Wave 0 Gaps) so no test hits the live Gemini API.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/core/gemini_client.py` async-SDK-specific plumbing (`client.aio.models.generate_content` call shape) | service/config | external-call | No existing external-LLM-API integration exists anywhere in the codebase (Supabase/JWKS is the only prior "external service client" analog, structurally different — sync REST vs async multimodal). Use RESEARCH.md's verified Code Examples directly instead of a codebase analog. |
| `apps/web` multipart file-upload UI (file picker + `FormData` POST) | component | file-I/O | No existing file-upload UI exists in `apps/web` (all current forms are JSON-only via `TransactionForm.tsx`). Use RESEARCH.md's FastAPI multipart guard pattern for the backend half; frontend half has no in-repo analog — implement per Figma frame + standard `<input type="file">` + `FormData`. |

## Metadata

**Analog search scope:** `backend/routers/`, `backend/services/`, `backend/models/`, `backend/dependencies/`, `backend/tests/`, `apps/web/app/`, `apps/web/components/`, `apps/web/lib/api/`
**Files scanned:** ~20 (transactions.py, goal_settings.py, saw_engine.py, goal_settings_service.py, goal_settings model, transaction model, auth dependency, conftest.py, test_transactions.py, home/page.tsx, ai/page.tsx, TransactionForm.tsx, SmartAllocationModal.tsx, client.ts, plus directory listings)
**Pattern extraction date:** 2026-07-09
