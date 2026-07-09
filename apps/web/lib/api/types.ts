/**
 * Macost API TypeScript interfaces — Phase 1 and Phase 2 shapes.
 *
 * ALL field names follow API_CONTRACT.md exactly (Indonesian snake_case for
 * domain entities; English snake_case for meta/technical fields). Do NOT
 * rename to camelCase — the backend returns these names on the wire and the
 * TypeScript compiler enforces consistency between mock JSON and the live API.
 *
 * Source of truth: API_CONTRACT.md v0.1
 * Covers: Auth, Wallets, Categories, Transactions, Goals, Goal Settings,
 *         Smart Allocation, Dashboard, AI Insight, Error shapes.
 */

// ---------------------------------------------------------------------------
// 1. Auth
// ---------------------------------------------------------------------------

/** POST /api/auth/register — request body */
export interface RegisterRequest {
  nama: string;
  email: string;
  password: string;
}

/** POST /api/auth/register — response (201) */
export interface RegisterResponse {
  id_pengguna: string;
  nama: string;
  email: string;
  access_token: string;
}

/** POST /api/auth/login — request body */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/auth/login — response (200) */
export interface LoginResponse {
  access_token: string;
  id_pengguna: string;
}

// ---------------------------------------------------------------------------
// 2. Wallets / Dompet
// ---------------------------------------------------------------------------

/** A single wallet object returned by GET /api/wallets and POST /api/wallets */
export interface Wallet {
  id_dompet: string;
  nama_dompet: string;
  saldo: number;
}

/** GET /api/wallets — response (200) */
export interface WalletsResponse {
  wallets: Wallet[];
}

/** POST /api/wallets — request body */
export interface WalletCreateRequest {
  nama_dompet: string;
}

/** PUT /api/wallets/{id} — request body */
export interface WalletUpdateRequest {
  nama_dompet: string;
}

// ---------------------------------------------------------------------------
// 3. Categories / Kategori
// ---------------------------------------------------------------------------

/**
 * A single category object.
 * flag_pemasukan is set for income categories; flag_pengeluaran for expense.
 * The server derives source_label from flag_pemasukan — frontend never sends source.
 */
export interface Category {
  id_kategori: string;
  nama_kategori: string;
  /** "Pemasukan" | "Pengeluaran" */
  tipe: string;
  flag_pemasukan: string | null;
  flag_pengeluaran: string | null;
}

/** GET /api/categories — response (200) */
export interface CategoriesResponse {
  categories: Category[];
}

// ---------------------------------------------------------------------------
// 4. Transactions / Transaksi
// ---------------------------------------------------------------------------

/**
 * POST /api/transactions — request body.
 *
 * IMPORTANT: Do NOT add a `source` field here. The server determines the
 * source label from the category's flag_pemasukan automatically (FR-005).
 * Frontend only sends kategori_id.
 */
export interface TransactionCreateRequest {
  nominal: number;
  tanggal_transaksi: string;
  metode_input: string;
  dompet_id: string;
  kategori_id: string;
  catatan: string | null;
}

/**
 * A transaction as returned by POST /api/transactions (201) and
 * GET /api/transactions items.
 *
 * source_label is server-assigned from the category — frontend reads it,
 * never sends it.
 */
export interface Transaction {
  id_transaksi: string;
  tipe_transaksi: string;
  nominal: number;
  tanggal_transaksi: string;
  metode_input: string;
  dompet_id: string;
  kategori_id: string;
  catatan: string | null;
  /** Server-assigned: "Fixed Routine" | "Flexible Side Income" | null */
  source_label: string | null;
  created_at: string;
  /**
   * true when this is a Side Income transaction — frontend should call
   * GET /api/transactions/{id}/allocation-suggestion to trigger the
   * allocation modal (FR-010).
   */
  allocation_suggestion_available: boolean;
}

/** GET /api/transactions — response (200) */
export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
}

/** PUT /api/transactions/{id} — request body (same shape as create) */
export type TransactionUpdateRequest = TransactionCreateRequest;

// ---------------------------------------------------------------------------
// 5. Goals
// ---------------------------------------------------------------------------

/**
 * A goal object as returned by GET /api/goals.
 * rank and progress_pct are computed server-side (SAW algorithm).
 */
export interface Goal {
  id_goal: string;
  nama_goal: string;
  nominal_target: number;
  nominal_terkumpul: number;
  deadline: string;
  skor_keinginan: number;
  skor_kepentingan: number;
  /** Percentage 0–100 */
  progress_pct: number;
  /** SAW-computed priority rank (1 = highest priority) */
  rank: number;
}

/** GET /api/goals — response (200) */
export interface GoalsResponse {
  goals: Goal[];
}

/** POST /api/goals — request body (FR-007) */
export interface GoalCreateRequest {
  nama_goal: string;
  nominal_target: number;
  deadline: string;
  /** User's desire score 1–5 */
  skor_keinginan: number;
}

/** PUT /api/goals/{id} — request body (same shape as create) */
export type GoalUpdateRequest = GoalCreateRequest;

/** A single allocation history entry within GET /api/goals/{id} */
export interface AllocationHistoryEntry {
  id_alokasi: string;
  nominal_alokasi: number;
  tanggal_alokasi: string;
  transaksi_id: string;
}

/** GET /api/goals/{id} — response (200); extends Goal with allocation history */
export interface GoalDetailResponse extends Goal {
  allocation_history: AllocationHistoryEntry[];
}

// ---------------------------------------------------------------------------
// 6. Goal Prioritization Settings
// ---------------------------------------------------------------------------

/** Weight values for the five SAW criteria */
export interface GoalSettingsWeights {
  personal_importance: number;
  progress_gap: number;
  saving_capacity: number;
  urgency: number;
  target_amount: number;
}

/** GET /api/goal-settings — response (200) */
export interface GoalSettings {
  strategy: string;
  weights: GoalSettingsWeights;
}

/** PUT /api/goal-settings — request body (FR-013, FR-014) */
export interface GoalSettingsUpdateRequest {
  strategy: "quick_win" | "importance_first";
  weights: GoalSettingsWeights;
}

// ---------------------------------------------------------------------------
// 7. Smart Allocation
// ---------------------------------------------------------------------------

/** An alternative goal in the allocation suggestion */
export interface AlternativeGoal {
  goal_id: string;
  goal_name: string;
  rank: number;
}

/**
 * GET /api/transactions/{id}/allocation-suggestion — response (200).
 *
 * When has_active_goal is false, only that field is present.
 * Frontend shows "Buat goal dulu" prompt in that case.
 */
export interface AllocationSuggestionResponse {
  has_active_goal: boolean;
  suggested_goal_id?: string;
  suggested_goal_name?: string;
  /** Suggested allocation amount in Rupiah */
  suggested_amount?: number;
  /** Suggested allocation as percentage of side income */
  suggested_pct?: number;
  alternative_goals?: AlternativeGoal[];
  /**
   * "side_income" — modal says "Pemasukan sampingan..."
   * "spending_nudge" — modal says "Kamu bisa hemat..."
   */
  suggestion_type?: string;
  /** Human-readable description of the suggestion */
  description?: string;
}

/** POST /api/allocations — request body (FR-011) */
export interface AllocationConfirmRequest {
  transaksi_id: string;
  goal_id: string;
  nominal_alokasi: number;
}

/** Updated goal summary returned in POST /api/allocations */
export interface AllocationGoalUpdate {
  id_goal: string;
  nominal_terkumpul: number;
  progress_pct: number;
}

/** POST /api/allocations — response (201) */
export interface AllocationConfirmResponse {
  id_alokasi: string;
  nominal_alokasi: number;
  tanggal_alokasi: string;
  goal_updated: AllocationGoalUpdate;
}

/** POST /api/allocations/{transaction_id}/skip — response (200) */
export interface AllocationSkipResponse {
  status: string;
  pending_until: string;
}

/**
 * A single pending allocation suggestion.
 * suggestion_type discriminates between side_income (pemasukan sampingan)
 * and spending_nudge (penghematan/uang tidak terpakai).
 */
export interface AllocationPending {
  transaksi_id: string;
  nominal: number;
  suggested_goal_name: string;
  expires_at: string;
  /** "side_income" | "spending_nudge" */
  suggestion_type: string;
  /** Short description of the suggestion (e.g. "Skip the afternoon Boba?") */
  description: string;
}

/** GET /api/allocations/pending — response (200) */
export interface AllocationPendingResponse {
  pending: AllocationPending[];
}

// ---------------------------------------------------------------------------
// 8. Dashboard
// ---------------------------------------------------------------------------

/** Expense breakdown per category */
export interface DashboardExpenseCategory {
  kategori_id: string;
  nama_kategori: string;
  total: number;
  pct: number;
}

/** Active goal progress summary for the dashboard */
export interface DashboardGoalSummary {
  id_goal: string;
  nama_goal: string;
  progress_pct: number;
}

/** Monthly income/expense trend entry */
export interface DashboardMonthlyTrend {
  month: string;
  income: number;
  expense: number;
}

/** Overspending alert state */
export interface DashboardOverspendingAlert {
  is_active: boolean;
  message: string | null;
}

/** GET /api/dashboard — response (200) */
export interface DashboardResponse {
  expense_by_category: DashboardExpenseCategory[];
  active_goals_summary: DashboardGoalSummary[];
  monthly_trend: DashboardMonthlyTrend[];
  overspending_alert: DashboardOverspendingAlert;
  total_balance: number;
}

// ---------------------------------------------------------------------------
// 9. AI Financial Assistant
// ---------------------------------------------------------------------------

/** A single AI insight entry */
export interface AiInsight {
  id: string;
  message: string;
  related_goal_id: string;
  generated_at: string;
}

/**
 * GET /api/ai-insight — response (200).
 *
 * When insight_available is false, show fallback_message instead
 * (FR-017 fallback handling).
 */
export interface AiInsightResponse {
  insight_available: boolean;
  insights?: AiInsight[];
  fallback_message?: string;
}

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

/** Structured error body returned by all API endpoints on non-2xx responses */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Narrows an unknown catch-block value to ApiErrorBody.
 *
 * apiFetch/apiMutate throw the parsed `{error:{code,message}}` body on a real
 * non-ok HTTP response from the backend. A raw fetch() failure (network down,
 * dead host, invalid URL, CORS, DNS) throws a plain Error/TypeError instead,
 * which has no `error` property at all — this guard tells the two apart so
 * callers never mistake a connectivity failure for a structured backend error.
 */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const maybeError = (value as { error?: unknown }).error;
  if (typeof maybeError !== "object" || maybeError === null) return false;
  const { code, message } = maybeError as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}

// ---------------------------------------------------------------------------
// 10. Scan Receipt
// ---------------------------------------------------------------------------

/**
 * POST /api/transactions/scan-receipt — response (200).
 *
 * When extracted is true, the receipt fields are populated.
 * When extracted is false, error_message provides the fallback text.
 */
export interface ScanReceiptResponse {
  extracted: boolean;
  merchant?: string;
  nominal?: number;
  tanggal_transaksi?: string;
  items?: string[];
  suggested_category_id?: string;
  error_message?: string;
}
