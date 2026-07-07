"""Goals service — batched aggregation + real-time SAW ranking
(02-10-PLAN.md Task 2).

`fetch_and_rank_goals()` is the single shared entry point other Phase 2
backend modules reuse (allocation_service.py in 02-12-PLAN.md,
dashboard_service.py in 02-14-PLAN.md) — do not duplicate this logic
elsewhere (see this plan's `key_links`).
"""

from datetime import date, datetime, timezone

from backend.core.supabase import get_supabase_admin
from backend.services import saw_engine
from backend.services.goal_settings_service import get_or_create_goal_settings


def _to_date(value) -> date:
    return value if isinstance(value, date) else date.fromisoformat(str(value))


def _first_day_n_months_ago(today: date, n: int) -> date:
    """Returns the first day of the calendar month that is `n` months
    before `today`'s month (n=0 -> this month)."""
    total_months = today.year * 12 + (today.month - 1) - n
    year, month = divmod(total_months, 12)
    return date(year, month + 1, 1)


def get_avg_monthly_side_income(user_id: str) -> float:
    """Average monthly Flexible Side Income (TC-03 `saving_capacity` input).

    Looks at the last 3 calendar months; if that set is empty, falls back to
    ALL such transactions ever (any calendar range); if still empty, returns
    0.0. Uses only `.eq()` filters (single query) — date-range filtering is
    done in Python to avoid depending on Supabase `.gte()/.lte()` chaining
    for this narrow aggregation.
    """
    supabase = get_supabase_admin()
    rows = (
        supabase.table("transaksi")
        .select("nominal, tanggal_transaksi")
        .eq("id_pengguna", user_id)
        .eq("tipe_transaksi", "Pemasukan")
        .eq("source_label", "Flexible Side Income")
        .execute()
        .data
    )
    if not rows:
        return 0.0

    today = datetime.now(timezone.utc).date()
    cutoff = _first_day_n_months_ago(today, 2)  # this month + 2 previous = 3

    recent_rows = [r for r in rows if _to_date(r["tanggal_transaksi"]) >= cutoff]
    candidate_rows = recent_rows if recent_rows else rows
    if not candidate_rows:
        return 0.0

    total = sum(r["nominal"] for r in candidate_rows)
    months = {
        (_to_date(r["tanggal_transaksi"]).year, _to_date(r["tanggal_transaksi"]).month)
        for r in candidate_rows
    }
    return total / max(1, len(months))


def fetch_and_rank_goals(user_id: str) -> list[dict]:
    """Fetches this user's goals, computes all derived fields, and returns
    them ranked by `saw_engine.rank_goals()`.

    Batched aggregation (Pattern 2, no N+1): goals + alokasi = 2 queries,
    plus 1 for the side-income average (TC-03) and 1 for goal_settings — 4
    total, regardless of goal count.
    """
    supabase = get_supabase_admin()
    goals = (
        supabase.table("goal")
        .select("*")
        .eq("id_pengguna", user_id)
        .execute()
        .data
    )
    if not goals:
        return []

    goal_ids = [g["id_goal"] for g in goals]
    alokasi_rows = (
        supabase.table("alokasi")
        .select("goal_id, nominal_alokasi")
        .in_("goal_id", goal_ids)
        .execute()
        .data
        if goal_ids
        else []
    )

    sums: dict[str, int] = {}
    for row in alokasi_rows:
        sums[row["goal_id"]] = sums.get(row["goal_id"], 0) + row["nominal_alokasi"]

    avg_monthly_side_income = get_avg_monthly_side_income(user_id)
    settings = get_or_create_goal_settings(user_id)
    today = datetime.now(timezone.utc).date()

    enriched_goals = []
    for g in goals:
        nominal_target = g["nominal_target"]
        nominal_terkumpul = sums.get(g["id_goal"], 0)
        progress_pct = (
            round(100 * nominal_terkumpul / nominal_target) if nominal_target else 0
        )

        deadline_date = _to_date(g["deadline"])
        # Pitfall 6: compute skor_kepentingan fresh on every read — never
        # persisted, so it never goes stale as the deadline approaches.
        skor_kepentingan = saw_engine.compute_skor_kepentingan(deadline_date, today)

        remaining_amount = nominal_target - nominal_terkumpul
        if remaining_amount <= 0:
            # Goal already fully funded — trivially feasible, guards 0/0.
            saving_capacity_raw = 1.0
        else:
            months_remaining = max(0, (deadline_date - today).days) / 30.0
            saving_capacity_raw = min(
                1.0, (months_remaining * avg_monthly_side_income) / remaining_amount
            )

        enriched_goals.append(
            {
                **g,
                "nominal_terkumpul": nominal_terkumpul,
                "progress_pct": progress_pct,
                "skor_kepentingan": skor_kepentingan,
                "saving_capacity_raw": saving_capacity_raw,
            }
        )

    return saw_engine.rank_goals(
        enriched_goals, settings["weights"], settings["strategy"]
    )
