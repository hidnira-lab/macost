"""Tests for GET /api/dashboard — 5-KPI aggregation, period filter
(02-14-PLAN.md Task 1).

Covers the 7 behavior cases from the plan's <behavior> block:
  1. compute_dashboard() returns keys in the exact fixed order
  2. expense_by_category sums Pengeluaran per kategori_id within period,
     pct is each category's share of total period expense
  3. active_goals_summary reuses goal_service.fetch_and_rank_goals(),
     filtered to progress_pct < 100, reduced to id_goal/nama_goal/progress_pct
  4. monthly_trend always returns the last 3 real calendar months, regardless
     of the selected period filter
  5. overspending_alert.is_active is True when a category's current-period
     total exceeds its trailing-3-month average by more than 20%, with a
     Bahasa Indonesia message naming the category; False/null otherwise
  6. total_balance is the all-time SUM of Pemasukan minus Pengeluaran,
     never period-scoped
  7. period="custom" with start_date/end_date scopes expense_by_category to
     that explicit range instead of a calendar month

Uses an isolated TestClient (bare FastAPI() + dashboard.router only),
matching the pattern established in test_goals.py/test_transactions.py —
independent of backend/main.py's central wiring (which is Task 2 of this
same plan, tested separately in test_main_integration.py).
"""

from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import dashboard
from backend.services import dashboard_service, goal_service, goal_settings_service

DEFAULT_WEIGHTS = {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162,
}

MAKAN_KATEGORI = {
    "id_kategori": "kat-makan",
    "nama_kategori": "Makan & Minum",
    "tipe": "Pengeluaran",
    "flag_pemasukan": None,
    "flag_pengeluaran": "Kebutuhan",
}

HIBURAN_KATEGORI = {
    "id_kategori": "kat-hiburan",
    "nama_kategori": "Hiburan",
    "tipe": "Pengeluaran",
    "flag_pemasukan": None,
    "flag_pengeluaran": "Keinginan",
}

FREELANCE_KATEGORI = {
    "id_kategori": "kat-freelance",
    "nama_kategori": "Freelance / Kerja Sampingan",
    "tipe": "Pemasukan",
    "flag_pemasukan": "Flexible Side Income",
    "flag_pengeluaran": None,
}


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(dashboard.router, prefix="/api")
    return app


def _client_as(user_id: str, app: FastAPI) -> TestClient:
    app.dependency_overrides[dashboard.get_current_user_id] = lambda: user_id
    return TestClient(app)


def _patch_supabase(monkeypatch, fake_supabase_client):
    monkeypatch.setattr(dashboard_service, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(goal_service, "get_supabase_admin", lambda: fake_supabase_client)
    monkeypatch.setattr(
        goal_settings_service, "get_supabase_admin", lambda: fake_supabase_client
    )


def _seed_goal_settings(fake_supabase_client, user_id="user-1"):
    fake_supabase_client.seed(
        "goal_settings",
        [{"id_pengguna": user_id, "strategy": "quick_win", "weights": DEFAULT_WEIGHTS}],
    )


# ---------------------------------------------------------------------------
# 1. Fixed key order
# ---------------------------------------------------------------------------

def test_compute_dashboard_returns_keys_in_exact_fixed_order(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI, HIBURAN_KATEGORI])

    result = dashboard_service.compute_dashboard("user-1")

    assert list(result.keys()) == [
        "expense_by_category",
        "active_goals_summary",
        "monthly_trend",
        "overspending_alert",
        "total_balance",
    ]


# ---------------------------------------------------------------------------
# 2. expense_by_category — period-scoped sums + pct
# ---------------------------------------------------------------------------

def test_expense_by_category_sums_per_category_within_period_and_pct_sums_to_100(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI, HIBURAN_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 600000,
                "tanggal_transaksi": "2026-06-05",
                "kategori_id": "kat-makan",
            },
            {
                "id_transaksi": "tx-2",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 400000,
                "tanggal_transaksi": "2026-06-10",
                "kategori_id": "kat-hiburan",
            },
            # Outside the period — must be excluded
            {
                "id_transaksi": "tx-3",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 999999,
                "tanggal_transaksi": "2026-01-01",
                "kategori_id": "kat-makan",
            },
        ],
    )

    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2026-06-01", end_date="2026-06-30"
    )

    by_id = {c["kategori_id"]: c for c in result["expense_by_category"]}
    assert by_id["kat-makan"]["total"] == 600000
    assert by_id["kat-makan"]["nama_kategori"] == "Makan & Minum"
    assert by_id["kat-hiburan"]["total"] == 400000
    assert sum(c["pct"] for c in result["expense_by_category"]) in (99, 100, 101)
    assert by_id["kat-makan"]["pct"] == 60
    assert by_id["kat-hiburan"]["pct"] == 40


# ---------------------------------------------------------------------------
# 3. active_goals_summary — reuses fetch_and_rank_goals, filtered <100%
# ---------------------------------------------------------------------------

def test_active_goals_summary_reuses_fetch_and_rank_goals_and_filters_completed(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [])

    far_deadline = (date.today() + timedelta(days=300)).isoformat()
    fake_supabase_client.seed(
        "goal",
        [
            {
                "id_goal": "goal-1",
                "id_pengguna": "user-1",
                "nama_goal": "Beli Laptop",
                "nominal_target": 8000000,
                "deadline": far_deadline,
                "skor_keinginan": 5,
                "created_at": "2026-06-01T00:00:00+00:00",
            },
            {
                "id_goal": "goal-2",
                "id_pengguna": "user-1",
                "nama_goal": "Goal Selesai",
                "nominal_target": 1000000,
                "deadline": far_deadline,
                "skor_keinginan": 3,
                "created_at": "2026-06-02T00:00:00+00:00",
            },
        ],
    )
    fake_supabase_client.seed(
        "alokasi",
        [
            {
                "id_alokasi": "aloc-1",
                "goal_id": "goal-1",
                "nominal_alokasi": 3200000,
            },
            {
                "id_alokasi": "aloc-2",
                "goal_id": "goal-2",
                "nominal_alokasi": 1000000,  # 100% funded -> excluded
            },
        ],
    )

    calls = []
    original = goal_service.fetch_and_rank_goals

    def _spy(user_id):
        calls.append(user_id)
        return original(user_id)

    monkeypatch.setattr(dashboard_service.goal_service, "fetch_and_rank_goals", _spy)

    result = dashboard_service.compute_dashboard("user-1")

    assert calls == ["user-1"]  # dashboard_service delegates, never duplicates
    assert len(result["active_goals_summary"]) == 1
    entry = result["active_goals_summary"][0]
    assert entry["id_goal"] == "goal-1"
    assert entry["nama_goal"] == "Beli Laptop"
    assert entry["progress_pct"] == 40
    assert set(entry.keys()) == {"id_goal", "nama_goal", "progress_pct"}


# ---------------------------------------------------------------------------
# 4. monthly_trend — always last 3 real calendar months, period-independent
# ---------------------------------------------------------------------------

def test_monthly_trend_always_last_3_months_regardless_of_period(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI, FREELANCE_KATEGORI])

    today = date.today()
    this_month_str = today.replace(day=1).isoformat()

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-income",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": this_month_str,
                "kategori_id": "kat-freelance",
            },
            {
                "id_transaksi": "tx-expense",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 200000,
                "tanggal_transaksi": this_month_str,
                "kategori_id": "kat-makan",
            },
        ],
    )

    # Deliberately pass an unrelated custom period far in the past — the
    # trend must still reflect the last 3 real months, not this custom range.
    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2020-01-01", end_date="2020-01-31"
    )

    assert len(result["monthly_trend"]) == 3
    months = [m["month"] for m in result["monthly_trend"]]
    current_month_key = f"{today.year:04d}-{today.month:02d}"
    assert months[-1] == current_month_key  # most recent month is last
    assert months == sorted(months)  # ascending chronological order

    current_entry = result["monthly_trend"][-1]
    assert current_entry["income"] == 500000
    assert current_entry["expense"] == 200000


# ---------------------------------------------------------------------------
# 5. overspending_alert — >20% over trailing 3-month average
# ---------------------------------------------------------------------------

def test_overspending_alert_active_when_category_exceeds_trailing_average_by_20pct(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [HIBURAN_KATEGORI])

    fake_supabase_client.seed(
        "transaksi",
        [
            # Trailing 3-month baseline (Mar/Apr/May 2026): 100k/month avg
            {
                "id_transaksi": "tx-mar",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-03-15",
                "kategori_id": "kat-hiburan",
            },
            {
                "id_transaksi": "tx-apr",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-04-15",
                "kategori_id": "kat-hiburan",
            },
            {
                "id_transaksi": "tx-may",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-05-15",
                "kategori_id": "kat-hiburan",
            },
            # Current period (June 2026): 150000 > 120000 (100000 * 1.2) -> overspending
            {
                "id_transaksi": "tx-jun",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 150000,
                "tanggal_transaksi": "2026-06-15",
                "kategori_id": "kat-hiburan",
            },
        ],
    )

    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2026-06-01", end_date="2026-06-30"
    )

    assert result["overspending_alert"]["is_active"] is True
    assert result["overspending_alert"]["message"] is not None
    assert "Hiburan" in result["overspending_alert"]["message"]


def test_overspending_alert_inactive_when_within_normal_range(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [HIBURAN_KATEGORI])

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-mar",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-03-15",
                "kategori_id": "kat-hiburan",
            },
            {
                "id_transaksi": "tx-apr",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-04-15",
                "kategori_id": "kat-hiburan",
            },
            {
                "id_transaksi": "tx-may",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-05-15",
                "kategori_id": "kat-hiburan",
            },
            # Current period (June 2026): 105000 -- well within 20% of 100000
            {
                "id_transaksi": "tx-jun",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 105000,
                "tanggal_transaksi": "2026-06-15",
                "kategori_id": "kat-hiburan",
            },
        ],
    )

    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2026-06-01", end_date="2026-06-30"
    )

    assert result["overspending_alert"]["is_active"] is False
    assert result["overspending_alert"]["message"] is None


# ---------------------------------------------------------------------------
# 6. total_balance — all-time, never period-scoped
# ---------------------------------------------------------------------------

def test_total_balance_is_all_time_regardless_of_period(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI, FREELANCE_KATEGORI])

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-old-income",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 2000000,
                "tanggal_transaksi": "2025-01-01",  # far outside any period
                "kategori_id": "kat-freelance",
            },
            {
                "id_transaksi": "tx-old-expense",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 500000,
                "tanggal_transaksi": "2025-02-01",
                "kategori_id": "kat-makan",
            },
            {
                "id_transaksi": "tx-recent-income",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pemasukan",
                "nominal": 500000,
                "tanggal_transaksi": "2026-06-01",
                "kategori_id": "kat-freelance",
            },
        ],
    )

    # Scope the request to a narrow custom period that excludes the 2025 rows
    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2026-06-01", end_date="2026-06-30"
    )

    # total_balance must still include the 2025 rows (all-time, unscoped)
    assert result["total_balance"] == 2000000 - 500000 + 500000


# ---------------------------------------------------------------------------
# 7. period="custom" scoping
# ---------------------------------------------------------------------------

def test_period_custom_scopes_expense_by_category_to_explicit_range(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI])

    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-in-range",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 100000,
                "tanggal_transaksi": "2026-05-15",
                "kategori_id": "kat-makan",
            },
            {
                "id_transaksi": "tx-out-of-range",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 999999,
                "tanggal_transaksi": "2026-06-15",
                "kategori_id": "kat-makan",
            },
        ],
    )

    result = dashboard_service.compute_dashboard(
        "user-1", period="custom", start_date="2026-05-01", end_date="2026-05-31"
    )

    assert len(result["expense_by_category"]) == 1
    assert result["expense_by_category"][0]["total"] == 100000


# ---------------------------------------------------------------------------
# Router-level smoke test — period query param actually reaches compute_dashboard
# ---------------------------------------------------------------------------

def test_get_dashboard_router_passes_period_query_params_through(
    monkeypatch, fake_supabase_client
):
    _patch_supabase(monkeypatch, fake_supabase_client)
    _seed_goal_settings(fake_supabase_client)
    fake_supabase_client.seed("kategori", [MAKAN_KATEGORI])
    fake_supabase_client.seed(
        "transaksi",
        [
            {
                "id_transaksi": "tx-1",
                "id_pengguna": "user-1",
                "tipe_transaksi": "Pengeluaran",
                "nominal": 250000,
                "tanggal_transaksi": "2026-05-15",
                "kategori_id": "kat-makan",
            },
        ],
    )

    app = _build_app()
    client = _client_as("user-1", app)

    response = client.get(
        "/api/dashboard",
        params={"period": "custom", "start_date": "2026-05-01", "end_date": "2026-05-31"},
    )

    assert response.status_code == 200
    data = response.json()
    assert list(data.keys()) == [
        "expense_by_category",
        "active_goals_summary",
        "monthly_trend",
        "overspending_alert",
        "total_balance",
    ]
    assert data["expense_by_category"][0]["total"] == 250000
