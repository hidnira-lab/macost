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
 *
 * 401 handling: a 401 response means the stored token is missing, invalid, or
 * expired (Supabase access tokens are short-lived and this app has no refresh
 * flow yet). On any 401 the stale token is cleared here so the user isn't
 * stuck re-hitting a dead token, and the thrown error is tagged with
 * `isAuthError: true` so callers can redirect to /login instead of just
 * showing a generic error message. See isAuthError() below.
 */

import { getToken, clearToken } from "@/lib/auth/session";

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
  const goalDetailMatch = path.match(/^\/api\/goals\/([^/]+)$/);
  if (goalDetailMatch) {
    const goalId = goalDetailMatch[1];
    const data = (goalDetailData as Record<string, unknown>)[goalId];
    if (data) return data;
    // fallback: return first goal if ID not found
    const firstKey = Object.keys(goalDetailData)[0];
    return (goalDetailData as Record<string, unknown>)[firstKey];
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
// Auth-error helpers
// ---------------------------------------------------------------------------

/**
 * Type guard for errors thrown by apiFetch/apiMutate that originated from a
 * 401 response. Use this in a page's catch block to redirect to /login
 * instead of showing a generic error message:
 *
 *   } catch (err) {
 *     if (isAuthError(err)) { router.push('/login'); return }
 *     setError('Gagal memuat ...')
 *   }
 */
export function isAuthError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { isAuthError?: boolean }).isAuthError === true;
}

/**
 * Parses a non-ok response's structured error body, tags 401s as auth
 * errors, and clears the stale token so a dead token isn't reused on the
 * next request.
 */
async function throwResponseError(response: Response): Promise<never> {
  const errorBody = await response.json().catch(() => ({
    error: { code: "UNKNOWN_ERROR", message: response.statusText },
  }));

  if (response.status === 401) {
    await clearToken();
    throw { ...errorBody, isAuthError: true };
  }

  throw errorBody;
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
    await throwResponseError(response);
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
    await throwResponseError(response);
  }

  // 204 No Content — return empty object cast to T
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
