"""Shared pytest fixtures for the Phase 2 backend test suite.

Every backend test file written in later Phase 2 plans (transactions, goals,
SAW engine, allocations, dashboard) consumes these fixtures — see
02-01-PLAN.md key_links.
"""

import uuid

import pytest

from backend.services import gemini_service


class _FakeResult:
    """Mimics supabase-py's execute() return value — a `.data` list."""

    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Chainable query builder mimicking supabase-py's PostgREST query builder.

    Supports the subset of the interface actually used in this codebase:
    .select(...).eq(...).eq(...).in_(...).insert(...).update(...).delete().execute()
    """

    def __init__(self, table_store: dict, table_name: str):
        self._table_store = table_store
        self._table_name = table_name
        self._filters: list[tuple[str, str, object]] = []
        self._insert_rows = None
        self._update_values = None
        self._delete = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self._filters.append(("in", column, list(values)))
        return self

    def insert(self, rows):
        self._insert_rows = [rows] if isinstance(rows, dict) else list(rows)
        return self

    def update(self, values):
        self._update_values = values
        return self

    def delete(self):
        self._delete = True
        return self

    def _matches(self, row: dict) -> bool:
        for op, column, value in self._filters:
            if op == "eq" and row.get(column) != value:
                return False
            if op == "in" and row.get(column) not in value:
                return False
        return True

    def execute(self) -> _FakeResult:
        table = self._table_store.setdefault(self._table_name, [])

        if self._insert_rows is not None:
            inserted = []
            for row in self._insert_rows:
                new_row = dict(row)
                new_row.setdefault("id", str(uuid.uuid4()))
                table.append(new_row)
                inserted.append(new_row)
            return _FakeResult(inserted)

        if self._update_values is not None:
            updated = []
            for row in table:
                if self._matches(row):
                    row.update(self._update_values)
                    updated.append(row)
            return _FakeResult(updated)

        if self._delete:
            remaining, deleted = [], []
            for row in table:
                (deleted if self._matches(row) else remaining).append(row)
            self._table_store[self._table_name] = remaining
            return _FakeResult(deleted)

        # SELECT (default)
        return _FakeResult([row for row in table if self._matches(row)])


class FakeSupabaseClient:
    """In-memory fake for supabase-py's `Client`, seeded per-test.

    Usage:
        client = FakeSupabaseClient()
        client.seed("dompet", [{...}, {...}])
        client.table("dompet").select("*").eq("id_pengguna", uid).execute().data
    """

    def __init__(self):
        self._tables: dict[str, list[dict]] = {}

    def seed(self, table_name: str, rows: list[dict]) -> None:
        self._tables[table_name] = [dict(r) for r in rows]

    def table(self, table_name: str) -> _FakeQuery:
        return _FakeQuery(self._tables, table_name)


@pytest.fixture
def fake_supabase_client() -> FakeSupabaseClient:
    """A fresh in-memory fake Supabase client for each test.

    Never hits the live Supabase project — unit tests for routers/services
    should seed this directly via `.seed(table_name, rows)`.
    """
    return FakeSupabaseClient()


@pytest.fixture
def sample_goals() -> list[dict]:
    """3 goals varying skor_keinginan, deadline proximity, target, and progress.

    Shaped for SAW-01 (known ranking order) and SAW-02 (identical-value
    tie-break — goals 2 and 3 deliberately share skor_keinginan=3 and an
    identical far-out deadline) test cases.
    """
    return [
        {
            "id_goal": "11111111-1111-1111-1111-111111111111",
            "id_pengguna": "user-1",
            "nama_goal": "Beli Laptop",
            "nominal_target": 8000000,
            "nominal_terkumpul": 3200000,
            "deadline": "2026-08-01",  # near-term -> highest urgency bucket
            "skor_keinginan": 5,
            "created_at": "2026-06-01T00:00:00Z",
        },
        {
            "id_goal": "22222222-2222-2222-2222-222222222222",
            "id_pengguna": "user-1",
            "nama_goal": "Dana Darurat",
            "nominal_target": 5000000,
            "nominal_terkumpul": 1000000,
            "deadline": "2027-01-01",  # far-out -> lowest urgency bucket
            "skor_keinginan": 3,
            "created_at": "2026-06-02T00:00:00Z",
        },
        {
            "id_goal": "33333333-3333-3333-3333-333333333333",
            "id_pengguna": "user-1",
            "nama_goal": "Liburan",
            "nominal_target": 3000000,
            "nominal_terkumpul": 2700000,
            "deadline": "2027-01-01",  # identical deadline to Dana Darurat
            "skor_keinginan": 3,  # identical skor_keinginan -> tie-break case
            "created_at": "2026-06-03T00:00:00Z",
        },
    ]


@pytest.fixture
def sample_weights() -> dict:
    """Locked default SAW weights (survey n=62), summing to exactly 1.0."""
    return {
        "personal_importance": 0.225,
        "progress_gap": 0.219,
        "saving_capacity": 0.215,
        "urgency": 0.178,
        "target_amount": 0.162,
    }


class _FakeGeminiResponse:
    """Mimics google-genai's `GenerateContentResponse` — just the `.text`
    attribute that gemini_service.py reads via `response.text`."""

    def __init__(self, text: str):
        self.text = text


class _FakeGeminiModels:
    """Mimics `client.aio.models` — the object whose `.generate_content`
    coroutine is awaited inside `asyncio.wait_for` by every gemini_service.py
    function. Configurable per-test via the `fake_gemini_response` fixture's
    returned factory: either a successful JSON `.text` or a raised exception,
    never both."""

    def __init__(self):
        self.return_text: str | None = None
        self.raise_exception: Exception | None = None
        self.calls: list[dict] = []

    async def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.raise_exception is not None:
            raise self.raise_exception
        return _FakeGeminiResponse(self.return_text)


class _FakeGeminiAio:
    def __init__(self, models: _FakeGeminiModels):
        self.models = models


class _FakeGeminiClient:
    """Never hits the live Gemini API — stands in for `genai.Client()`."""

    def __init__(self):
        self.models = _FakeGeminiModels()
        self.aio = _FakeGeminiAio(self.models)


@pytest.fixture
def fake_gemini_response(monkeypatch):
    """Monkeypatches `backend.services.gemini_service.get_gemini_client` (the
    call site actually used inside gemini_service.py, per "patch where used")
    so no test hits the real Gemini API. Mirrors `FakeSupabaseClient`'s
    "seed then assert" fixture philosophy.

    Usage:
        fake_gemini_response(text='{"merchant": "X", ...}')   # success path
        fake_gemini_response(exception=asyncio.TimeoutError())  # timeout path
        fake_gemini_response(exception=Exception("rate limited"))  # any-failure path
    """
    fake_client = _FakeGeminiClient()
    monkeypatch.setattr(gemini_service, "get_gemini_client", lambda: fake_client)

    def _configure(*, text: str | None = None, exception: Exception | None = None):
        """Configures the stub's next response, then returns the fake
        client itself (e.g. `fake.models.calls` for call-count assertions)."""
        fake_client.models.return_text = text
        fake_client.models.raise_exception = exception
        return fake_client

    return _configure


@pytest.fixture
def spy_wait_for_timeout(monkeypatch):
    """Wraps `asyncio.wait_for` with a spy that records the `timeout=` kwarg
    it was called with, then delegates to the real implementation — lets a
    test assert the exact SCAN-03/AIINS-03 timeout constants without
    reimplementing asyncio.wait_for's semantics."""
    import asyncio

    captured: dict = {}
    real_wait_for = asyncio.wait_for

    async def _spy(coro, timeout=None):
        captured["timeout"] = timeout
        return await real_wait_for(coro, timeout=timeout)

    monkeypatch.setattr(gemini_service.asyncio, "wait_for", _spy)
    return captured
