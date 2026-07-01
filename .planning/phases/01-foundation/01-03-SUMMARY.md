---
phase: "01-foundation"
plan: "3"
subsystem: "apps/web/lib/api"
tags: ["api-client", "typescript", "mocks", "swr", "type-safety"]
dependency_graph:
  requires: []
  provides: ["apiFetch", "apiMutate", "TypeScript interfaces", "USE_MOCK toggle"]
  affects: ["apps/web/lib/api/client.ts", "apps/web/lib/api/types.ts"]
tech_stack:
  added: ["swr ^2"]
  patterns: ["static JSON imports for mocks", "USE_MOCK env toggle", "generic fetch abstraction"]
key_files:
  created:
    - apps/web/lib/api/client.ts
    - apps/web/lib/api/types.ts
    - apps/web/lib/auth/session.ts
    - apps/web/mocks/wallets.json
  modified:
    - apps/web/package.json
    - apps/web/package-lock.json
decisions:
  - "Static JSON imports (not fetch) for mocks — works in static export / Tauri without public/ relocation"
  - "apiFetch handles reads (mock-able); apiMutate always calls real API — keeps mutation paths testable"
  - "getToken() stub returns null — real implementation merged from Track D after session persistence layer is wired"
  - "wallets.json stub created by Track C so client.ts static import compiles without Track D present"
metrics:
  duration: "16 minutes"
  completed: "2026-07-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
status: complete
---

# Phase 1 Plan 3: API Client and TypeScript Interfaces Summary

**One-liner:** USE_MOCK-toggled apiFetch/apiMutate client with static JSON mock imports and complete Phase 1–2 TypeScript interfaces derived from API_CONTRACT.md.

## What Was Built

### Task 1 — SWR installation, API client, and auth session stub

Installed `swr ^2` as a runtime dependency. Created the shared API abstraction layer at `apps/web/lib/api/client.ts`:

- `apiFetch<T>(path, init?)` — GET reads; routes to static JSON mock imports when `NEXT_PUBLIC_USE_MOCK=true`, otherwise calls `NEXT_PUBLIC_API_BASE_URL` with `Authorization: Bearer <token>` header
- `apiMutate<T>(path, method, body, token?)` — POST/PUT/DELETE; always calls real API regardless of mock toggle
- Mock resolver maps API paths to static imports from `apps/web/mocks/` — no fetch round-trip, works in static export
- Error path parses the `{"error": {"code": ..., "message": ...}}` shape and throws it for callers to handle

Created `apps/web/lib/auth/session.ts` stub with `getToken()` returning `null`. This stub will be replaced by Track D's real Supabase session implementation without requiring any changes to `client.ts`.

Created `apps/web/mocks/wallets.json` stub (2 sample wallets: Gopay 250,000 IDR, Cash 50,000 IDR) so the static import in `client.ts` compiles without Track D being merged first.

### Task 2 — TypeScript interfaces for all Phase 1-2 API shapes

Created `apps/web/lib/api/types.ts` with complete interface coverage of `API_CONTRACT.md`:

| Domain | Interfaces |
|--------|-----------|
| Auth | RegisterRequest, RegisterResponse, LoginRequest, LoginResponse |
| Wallets | Wallet, WalletsResponse, WalletCreateRequest, WalletUpdateRequest |
| Categories | Category, CategoriesResponse |
| Transactions | TransactionCreateRequest (no source), Transaction, TransactionsResponse, TransactionUpdateRequest |
| Goals | Goal, GoalsResponse, GoalCreateRequest, GoalUpdateRequest, GoalDetailResponse, AllocationHistoryEntry |
| Goal Settings | GoalSettings, GoalSettingsWeights, GoalSettingsUpdateRequest |
| Smart Allocation | AllocationSuggestionResponse, AlternativeGoal, AllocationConfirmRequest, AllocationConfirmResponse, AllocationSkipResponse, AllocationPending, AllocationPendingResponse |
| Dashboard | DashboardResponse, DashboardExpenseCategory, DashboardGoalSummary, DashboardMonthlyTrend, DashboardOverspendingAlert |
| AI Insight | AiInsightResponse, AiInsight |
| Error | ApiErrorBody |

**Critical constraint enforced:** `TransactionCreateRequest` has no `source` field — this matches API_CONTRACT.md which forbids frontend from sending source (server derives it from `flag_pemasukan`).

## Mock File Verification

Both existing mock files were verified against the TypeScript interfaces:

| Mock file | Verified against | Result |
|-----------|-----------------|--------|
| `apps/web/mocks/goals.json` | `GoalsResponse` / `Goal` | PASS — all 9 fields present with correct types (rank: number, id_goal: string, etc.) |
| `apps/web/mocks/allocation-suggestion.json` | `AllocationSuggestionResponse` / `AlternativeGoal` | PASS — has_active_goal: boolean, suggested_amount: number, alternative_goals items have goal_id/goal_name/rank |
| `apps/web/mocks/transactions.json` | `TransactionsResponse` / `Transaction` | PASS — includes source_label, allocation_suggestion_available, total, page |
| `apps/web/mocks/dashboard.json` | `DashboardResponse` | PASS — all 5 top-level fields match interfaces |

No mock file corrections were needed — all existing mock data matched the API contract.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` from apps/web/ | PASS |
| `npx tsc --noEmit` from apps/web/ | PASS — zero errors |
| `client.ts` exports `apiFetch` and `apiMutate` | PASS |
| `types.ts` exports all required interfaces | PASS — 16 matching exports |
| `grep -c '"source"' types.ts` | 0 (PASS — no source field) |
| Mock JSON field names match interfaces | PASS |

## Deviations from Plan

### Auto-added: wallets.json mock stub (Rule 2 — missing critical functionality)

**Found during:** Task 1 implementation  
**Issue:** `client.ts` uses static imports for mock JSON files. `wallets.json` did not exist yet (plan says Track D creates it). A missing static import would cause TypeScript compilation to fail before Track D is merged.  
**Fix:** Created `apps/web/mocks/wallets.json` with minimal valid data matching the `WalletsResponse` interface (2 sample wallets). Track D can update the content; Track C only needed the file to exist.  
**Files modified:** `apps/web/mocks/wallets.json` (created)  
**Commit:** fd636e3

### Auto-added: lib/auth/session.ts stub (Rule 2 — missing dependency)

**Found during:** Task 1 implementation  
**Issue:** `client.ts` must import `getToken()` from `@/lib/auth/session` (Track D dependency). File did not exist yet on this branch.  
**Fix:** Created a stub that returns `null` with a clear TODO comment pointing to Track D. This compiles correctly under strict mode and gracefully skips the Authorization header for unauthenticated requests.  
**Files modified:** `apps/web/lib/auth/session.ts` (created)  
**Commit:** fd636e3

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `getToken()` returns `null` | `apps/web/lib/auth/session.ts` | Track D not yet merged; stub allows Track C to compile. Real implementation reads Supabase JWT from tauri-plugin-store. |
| `wallets.json` sample data | `apps/web/mocks/wallets.json` | Track D owns the authoritative mock content; Track C created minimal stub for compilation. |

## Threat Flags

No new threat surface introduced. The USE_MOCK toggle is controlled by `NEXT_PUBLIC_USE_MOCK` (client-visible, intentional per threat model T-01-C-02). The API base URL is a public URL by design (T-01-C-01). No auth secrets appear in any client-side file.

## Self-Check: PASSED

- `apps/web/lib/api/client.ts` exists ✓
- `apps/web/lib/api/types.ts` exists ✓
- `apps/web/lib/auth/session.ts` exists ✓
- `apps/web/mocks/wallets.json` exists ✓
- Commits fd636e3 and 56a36cc exist in git log ✓
- `npx tsc --noEmit` exits 0 ✓
- `npm run lint` exits 0 ✓
