"""Dashboard aggregation service (02-14-PLAN.md Task 1).

`compute_dashboard()` is the single entry point for `GET /api/dashboard`.
Reuses `goal_service.fetch_and_rank_goals()` for `active_goals_summary` —
never re-implements goal-progress computation (see this plan's `key_links`
and `02-RESEARCH.md` "Pattern 2: Batched aggregation, never per-row
queries").

Query budget owned directly by this module: exactly 2 queries — `transaksi`
fetched ONCE, unfiltered by date (period/trailing-window/all-time slicing
all happen in Python over that single result set, per 02-RESEARCH.md's
"Derived Fields: SQL Aggregation vs Python-Side" recommendation, and to
avoid a 3rd query for the trailing-3-month comparison window), plus
`kategori` fetched once for `nama_kategori` lookup (shared/unscoped read,
matching `categories.py`'s convention). `fetch_and_rank_goals()` adds its
own 4 queries internally — never N+1 per category/goal either way.
"""

from datetime import date, datetime, timedelta, timezone

from backend.core.supabase import get_supabase_admin
from backend.services import goal_service

# Overspending threshold: current-period category total must exceed the
# trailing-3-month average for that category by more than this fraction
# (T-2-01 non-security "sanity" threshold — 20% per this plan's <behavior>).
OVERSPENDING_THRESHOLD = 1.2


def _to_date(value) -> date:
    return value if isinstance(value, date) else date.fromisoformat(str(value))


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def _shift_months(d: date, n: int) -> date:
    """First day of the calendar month that is `n` months before `d`'s
    month (n may be negative to shift forward)."""
    total_months = d.year * 12 + (d.month - 1) - n
    year, month = divmod(total_months, 12)
    return date(year, month + 1, 1)


def _last_day_of_month(d: date) -> date:
    next_month_start = _shift_months(d, -1)
    return next_month_start - timedelta(days=1)


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _resolve_period(
    period: str,
    start_date: str | None,
    end_date: str | None,
    today: date,
) -> tuple[date, date]:
    if period == "custom":
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for period=custom")
        return date.fromisoformat(start_date), date.fromisoformat(end_date)
    if period == "last_month":
        last_month_start = _shift_months(today, 1)
        return last_month_start, _last_day_of_month(last_month_start)
    # default: this_month — from the 1st of this month through today
    return _month_start(today), today


def compute_dashboard(
    user_id: str,
    period: str = "this_month",
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Returns the 5 dashboard KPIs, keys inserted in the exact fixed order
    required by API_CONTRACT.md §8 / 02-RESEARCH.md (research-validated,
    not arbitrary): expense_by_category, active_goals_summary,
    monthly_trend, overspending_alert, total_balance.
    """
    supabase = get_supabase_admin()
    today = datetime.now(timezone.utc).date()

    range_start, range_end = _resolve_period(period, start_date, end_date, today)

    # Single wider fetch — see module docstring.
    all_transactions = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_pengguna", user_id)
        .execute()
        .data
    )

    kategori_rows = supabase.table("kategori").select("*").execute().data
    kategori_name_by_id = {k["id_kategori"]: k["nama_kategori"] for k in kategori_rows}

    # -----------------------------------------------------------------
    # expense_by_category — period-scoped sums per kategori_id
    # -----------------------------------------------------------------
    period_totals_by_category: dict[str, int] = {}
    for t in all_transactions:
        if t["tipe_transaksi"] != "Pengeluaran":
            continue
        tx_date = _to_date(t["tanggal_transaksi"])
        if not (range_start <= tx_date <= range_end):
            continue
        cat_id = t["kategori_id"]
        period_totals_by_category[cat_id] = (
            period_totals_by_category.get(cat_id, 0) + t["nominal"]
        )

    total_period_expense = sum(period_totals_by_category.values())
    expense_by_category = [
        {
            "kategori_id": cat_id,
            "nama_kategori": kategori_name_by_id.get(cat_id, ""),
            "total": total,
            "pct": (
                round(100 * total / total_period_expense)
                if total_period_expense
                else 0
            ),
        }
        for cat_id, total in period_totals_by_category.items()
    ]

    # -----------------------------------------------------------------
    # active_goals_summary — reuses the shared SAW-ranking helper, never
    # re-implements goal-progress computation here (key_links).
    # -----------------------------------------------------------------
    ranked_goals = goal_service.fetch_and_rank_goals(user_id)
    active_goals_summary = [
        {
            "id_goal": g["id_goal"],
            "nama_goal": g["nama_goal"],
            "progress_pct": g["progress_pct"],
        }
        for g in ranked_goals
        if g["progress_pct"] < 100
    ]

    # -----------------------------------------------------------------
    # monthly_trend — ALWAYS the last 3 real calendar months anchored to
    # `today`, regardless of the selected `period` filter (trend context
    # is always 3 months, per this plan's <behavior>).
    # -----------------------------------------------------------------
    monthly_trend = []
    for i in range(2, -1, -1):
        month_start = _shift_months(today, i)
        month_end = _last_day_of_month(month_start)
        month_income = 0
        month_expense = 0
        for t in all_transactions:
            tx_date = _to_date(t["tanggal_transaksi"])
            if not (month_start <= tx_date <= month_end):
                continue
            if t["tipe_transaksi"] == "Pemasukan":
                month_income += t["nominal"]
            elif t["tipe_transaksi"] == "Pengeluaran":
                month_expense += t["nominal"]
        monthly_trend.append(
            {
                "month": _month_key(month_start),
                "income": month_income,
                "expense": month_expense,
            }
        )

    # -----------------------------------------------------------------
    # overspending_alert — current-period category total vs. the
    # trailing-3-calendar-month average for that same category, computed
    # over the 3 months strictly BEFORE the selected period's start (never
    # overlapping the period itself, so a category is never compared
    # against a baseline that includes its own current total).
    # -----------------------------------------------------------------
    trailing_end = range_start - timedelta(days=1)
    trailing_start = _shift_months(range_start, 3)
    trailing_totals_by_category: dict[str, int] = {}
    for t in all_transactions:
        if t["tipe_transaksi"] != "Pengeluaran":
            continue
        tx_date = _to_date(t["tanggal_transaksi"])
        if not (trailing_start <= tx_date <= trailing_end):
            continue
        cat_id = t["kategori_id"]
        trailing_totals_by_category[cat_id] = (
            trailing_totals_by_category.get(cat_id, 0) + t["nominal"]
        )

    is_active = False
    message = None
    worst_ratio = 0.0
    for cat_id, total in period_totals_by_category.items():
        trailing_total = trailing_totals_by_category.get(cat_id, 0)
        if trailing_total <= 0:
            continue  # no baseline to compare against — never a false positive
        trailing_avg = trailing_total / 3
        ratio = total / trailing_avg
        if ratio > OVERSPENDING_THRESHOLD and ratio > worst_ratio:
            worst_ratio = ratio
            is_active = True
            overrun_pct = round((ratio - 1) * 100)
            nama = kategori_name_by_id.get(cat_id, cat_id)
            message = (
                f"Pengeluaran kategori {nama} bulan ini {overrun_pct}% lebih tinggi "
                "dari rata-rata 3 bulan terakhir."
            )

    # -----------------------------------------------------------------
    # total_balance — SUM of Pemasukan minus Pengeluaran across ALL of
    # the user's transactions, all-time — NEVER period-scoped (consistent
    # with the sum of individual wallet balances from 02-09-PLAN.md).
    # -----------------------------------------------------------------
    total_balance = sum(
        t["nominal"] if t["tipe_transaksi"] == "Pemasukan" else -t["nominal"]
        for t in all_transactions
    )

    return {
        "expense_by_category": expense_by_category,
        "active_goals_summary": active_goals_summary,
        "monthly_trend": monthly_trend,
        "overspending_alert": {"is_active": is_active, "message": message},
        "total_balance": total_balance,
    }
