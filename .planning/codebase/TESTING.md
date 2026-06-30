# Testing Patterns

**Analysis Date:** 2026-06-30

> Note: The codebase is in early scaffold stage. No test files, test frameworks, or test configurations have been set up yet. This document prescribes the testing approach to adopt based on the tech stack and project structure.

## Current State

**Tests found:** None  
**Test config files found:** None  
**Test frameworks installed:** None (not present in `apps/web/package.json` or `backend/`)

## Recommended Test Setup

### Frontend (Next.js / React)

**Runner:** Vitest (preferred with Next.js App Router) or Jest with `@testing-library/react`

**Suggested packages to add to `apps/web/`:**
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

**Suggested `vitest.config.ts` (place at `apps/web/vitest.config.ts`):**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

**Run Commands:**
```bash
npx vitest              # Run all tests (watch mode)
npx vitest run          # Run once (CI)
npx vitest --coverage   # With coverage
```

### Backend (FastAPI / Python)

**Runner:** pytest

**Suggested packages to add to `backend/`:**
```bash
pip install pytest pytest-asyncio httpx
```

**Run Commands:**
```bash
cd backend && pytest                  # Run all tests
cd backend && pytest -v               # Verbose
cd backend && pytest --cov=. --cov-report=html  # Coverage
```

## Test File Organization

**Frontend — co-located with source:**
```
apps/web/
├── app/
│   ├── page.tsx
│   └── page.test.tsx        # Component test alongside source
├── components/
│   ├── GoalCard.tsx
│   └── GoalCard.test.tsx
└── lib/
    ├── api.ts
    └── api.test.ts
```

**Backend — dedicated tests directory:**
```
backend/
├── main.py
├── services/
│   └── saw_engine.py
└── tests/
    ├── __init__.py
    ├── test_main.py
    ├── test_saw_engine.py
    └── test_transactions.py
```

**Naming:**
- Frontend: `<ComponentName>.test.tsx` or `<module>.test.ts`
- Backend: `test_<module>.py` (pytest convention)

## Test Structure

**Frontend component tests:**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import GoalCard from "@/components/GoalCard";

describe("GoalCard", () => {
  it("displays goal name and progress", () => {
    render(<GoalCard nama_goal="Beli Laptop" progress_pct={40} />);
    expect(screen.getByText("Beli Laptop")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
```

**Backend API endpoint tests (httpx + pytest):**
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "Macost backend running"}
```

**Backend service unit tests:**
```python
from services.saw_engine import rank_goals

def test_saw_ranking_returns_sorted_goals():
    goals = [...]  # mock goal objects
    ranked = rank_goals(goals, weights={...})
    assert ranked[0].rank == 1
    assert ranked[0].skor >= ranked[1].skor
```

## Mocking

**Frontend — API calls:**
Use Vitest's `vi.mock()` to mock fetch or API client modules:
```typescript
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getDashboard: vi.fn().mockResolvedValue(mockDashboardData),
}));
```

**Mock data source:** Reuse JSON files from `apps/web/mocks/` as test fixtures:
```typescript
import dashboardMock from "@/mocks/dashboard.json";
```

**Backend — Supabase:**
Mock the Supabase client in tests to avoid real DB calls:
```python
from unittest.mock import MagicMock, patch

@patch("services.transactions.supabase")
def test_create_transaction(mock_supabase):
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [...]
    ...
```

**What to Mock:**
- External API calls (Supabase, AI/LLM services)
- File upload processing (receipt scan, e-statement)
- Date/time-sensitive operations

**What NOT to Mock:**
- SAW ranking algorithm (`backend/services/saw_engine.py`) — test with real inputs/outputs to validate weights
- JSON parsing and response serialization
- Business rule validations (weight sum = 1.0, etc.)

## Fixtures and Test Data

**Reuse mock JSON files** from `apps/web/mocks/` as the canonical test data source:
- `apps/web/mocks/dashboard.json` — dashboard response fixture
- `apps/web/mocks/goals.json` — goals list fixture
- `apps/web/mocks/transactions.json` — transactions list fixture
- `apps/web/mocks/allocation-suggestion.json` — allocation suggestion fixture

**Backend fixtures (pytest):**
```python
import pytest

@pytest.fixture
def sample_goal():
    return {
        "id_goal": "goal_001",
        "nama_goal": "Beli Laptop",
        "nominal_target": 8000000,
        "nominal_terkumpul": 3200000,
        "deadline": "2026-12-31",
        "skor_keinginan": 5,
        "skor_kepentingan": 4,
    }
```

## Coverage

**Requirements:** Not yet enforced — recommended minimum 70% for critical paths

**Critical paths to cover:**
- SAW ranking algorithm (`backend/services/saw_engine.py`) — 100% target
- Goal weight validation (sum must = 1.0)
- Source label resolution from `flag_pemasukan`
- Allocation suggestion logic
- Error response shapes matching `API_CONTRACT.md`

## Test Types

**Unit Tests:**
- SAW engine ranking logic (all 5 criteria, weight normalization)
- Business rule validators (goal weight sum, nominal > 0)
- Frontend pure utility functions in `apps/web/lib/`

**Integration Tests:**
- FastAPI endpoint request/response shapes (must match `API_CONTRACT.md` exactly)
- Supabase query construction (with mocked client)
- Full transaction create → source label assignment flow

**E2E Tests:**
- Not configured yet; Playwright could be added later for critical user flows (login, add transaction, allocation modal)

## Key Areas Requiring Tests (Priority Order)

1. `backend/services/saw_engine.py` — SAW algorithm is core differentiator; no tests = high risk
2. `POST /api/transactions` — source label resolution from `flag_pemasukan` (FR-005)
3. `GET /api/transactions/{id}/allocation-suggestion` — suggestion logic
4. `PUT /api/goal-settings` — weight sum validation
5. `POST /api/allocations` — allocation confirmation and goal progress update
6. Frontend allocation modal flow — confirm/skip user interactions

## Async Testing

**Backend (FastAPI async endpoints):**
```python
import pytest

@pytest.mark.asyncio
async def test_async_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/goals")
    assert response.status_code == 200
```

**Frontend (async data fetching):**
```typescript
import { waitFor } from "@testing-library/react";

it("loads goals from API", async () => {
  render(<GoalsPage />);
  await waitFor(() => {
    expect(screen.getByText("Beli Laptop")).toBeInTheDocument();
  });
});
```

---

*Testing analysis: 2026-06-30*
