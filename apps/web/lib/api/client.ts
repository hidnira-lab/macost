/**
 * Macost API client — shared abstraction layer for all HTTP calls.
 *
 * Two functions:
 *   apiFetch<T>     — GET reads; routes to local mock JSON when USE_MOCK=true
 *   apiMutate<T>    — POST/PUT/DELETE; always calls real API (mocks don't apply)
 *
 * Toggle:
 *   NEXT_PUBLIC_USE_MOCK=true   → mock data from apps/web/mocks/*.json (static imports)
 *   NEXT_PUBLIC_USE_MOCK=false  → real FastAPI backend at NEXT_PUBLIC_API_BASE_URL
 *
 * Mock JSON files live in apps/web/mocks/ — NOT in public/ — and are
 * consumed via static imports so they work in static export (Tauri target)
 * without any fetch round-trip.
 *
 * Auth: getToken() is imported from @/lib/auth/session. When a token is
 * available the Authorization header is set to "Bearer <token>". For public
 * endpoints (register, login) the token will be null and the header is omitted.
 */

import { getToken } from "@/lib/auth/session";

// Static mock imports — all mock JSON files stay in apps/web/mocks/
import goalsData from "@/mocks/goals.json";
import goalDetailData from "@/mocks/goal-detail.json";
import goalSettingsData from "@/mocks/goal-settings.json";
import allocationSuggestionData from "@/mocks/allocation-suggestion.json";
import transactionsData from "@/mocks/transactions.json";
import walletsData from "@/mocks/wallets.json";
import dashboardData from "@/mocks/dashboard.json";
import allocationsPendingData from "@/mocks/allocations-pending.json";
import categoriesData from "@/mocks/categories.json";

// ---------------------------------------------------------------------------
// Mock resolver
// ---------------------------------------------------------------------------

/**
 * Map an API path to the corresponding static mock data.
 * Supports exact matches and simple parametrized patterns.
 */
function resolveMock(path: string): unknown {
  // /api/goals/{id} — single goal detail (must be checked BEFORE /api/goals)
  if (/^\/api\/goals\/[^/]+$/.test(path)) {
    return goalDetailData;
  }

  // /api/goals
  if (path === "/api/goals") return goalsData;

  // /api/goal-settings
  if (path === "/api/goal-settings") return goalSettingsData;

  // /api/allocations/pending
  if (path === "/api/allocations/pending") return allocationsPendingData;

  // /api/transactions — list (with optional query params)
  if (path === "/api/transactions" || path.startsWith("/api/transactions?")) {
    return transactionsData;
  }

  // /api/transactions/{id}/allocation-suggestion
  if (/^\/api\/transactions\/[^/]+\/allocation-suggestion/.test(path)) {
    return allocationSuggestionData;
  }

  // /api/categories
  if (path === "/api/categories") return categoriesData;

  // /api/wallets
  if (path === "/api/wallets") return walletsData;

  // /api/categories
  if (path === "/api/categories") return categoriesData;

  // /api/dashboard (with optional query params)
  if (path === "/api/dashboard" || path.startsWith("/api/dashboard?")) {
    return dashboardData;
  }

  throw new Error(
    `[apiFetch] No mock registered for path: "${path}". ` +
      `Add a static import and a case in resolveMock() in lib/api/client.ts.`
  );
}

// ---------------------------------------------------------------------------
// apiFetch — GET reads (mock-able)
// ---------------------------------------------------------------------------

/**
 * Fetch data from the API.
 *
 * When NEXT_PUBLIC_USE_MOCK is exactly "true", returns local mock data without
 * making any network request. Any other value (including absent) calls the real
 * API at NEXT_PUBLIC_API_BASE_URL.
 *
 * @param path   API path starting with "/" — e.g. "/api/goals"
 * @param init   Optional RequestInit overrides (method defaults to GET)
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  if (useMock) {
    return resolveMock(path) as T;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const url = `${baseUrl}${path}`;

  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    method: "GET",
    ...init,
    headers,
  });

  if (!response.ok) {
    // Parse and rethrow the structured error body from FastAPI
    const errorBody = await response.json().catch(() => ({
      error: { code: "UNKNOWN_ERROR", message: response.statusText },
    }));
    throw errorBody;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// apiMutate — POST / PUT / DELETE (always real API)
// ---------------------------------------------------------------------------

/**
 * Perform a mutating request (POST, PUT, DELETE) against the real API.
 *
 * Mock mode does NOT apply here — mutations always go to the real backend.
 * This keeps write paths free of mock complexity and ensures mutations are
 * tested against real data during development.
 *
 * @param path    API path starting with "/" — e.g. "/api/goals"
 * @param method  HTTP method — "POST" | "PUT" | "DELETE"
 * @param body    Request body (will be JSON-serialised); pass null for DELETE
 * @param token   Optional token override; falls back to getToken()
 */
export async function apiMutate<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body: unknown,
  token?: string
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const url = `${baseUrl}${path}`;

  const resolvedToken = token ?? await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      error: { code: "UNKNOWN_ERROR", message: response.statusText },
    }));
    throw errorBody;
  }

  // 204 No Content — return empty object cast to T
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
