"""AI Financial Insight aggregation (AIINS-01/02/03).

Aggregates the requesting user's own transactions and SAW-ranked goals into
a Bahasa Indonesia prompt, then delegates to gemini_service.generate_insight
— which already enforces its own internal 15s asyncio.wait_for timeout
(03-01). This module does NOT add a second timeout wrapper; it trusts and
returns generate_insight's result verbatim (a list[InsightItem] or None).
"""

import json
from datetime import date, datetime, timedelta, timezone

from backend.core.supabase import get_supabase_admin
from backend.models.insight import InsightItem
from backend.services.gemini_service import generate_insight
from backend.services.goal_service import fetch_and_rank_goals

# Bounded window so the prompt doesn't grow unboundedly for long-lived
# accounts — 90 days mirrors a quarterly view of spending/income behavior,
# wide enough to catch monthly patterns without unbounded prompt growth.
TRANSACTION_WINDOW_DAYS = 90

INSIGHT_PROMPT_TEMPLATE = (
    "Kamu adalah asisten keuangan pribadi. Berdasarkan data transaksi "
    "{window_days} hari terakhir dan daftar goal tabungan berikut (sudah "
    "diurutkan berdasarkan prioritas SAW), berikan 1-4 insight keuangan "
    "singkat dalam Bahasa Indonesia yang natural dan bisa langsung "
    "ditindaklanjuti. Setiap insight WAJIB menyertakan action_verb (salah "
    "satu dari: Alokasikan, Kurangi, Pertimbangkan) dan WAJIB terkait ke "
    "TEPAT SATU goal (pakai id_goal dari data goal di bawah) ATAU kategori "
    "(pakai kategori_id dari data transaksi di bawah) — jangan biarkan "
    "keduanya kosong.\n\n"
    "Transaksi:\n{transactions}\n\n"
    "Goal (terurut prioritas SAW):\n{goals}\n\n"
    "Balas dalam JSON array sesuai schema."
)


def _to_date(value) -> date:
    return value if isinstance(value, date) else date.fromisoformat(str(value))


async def generate_user_insights(user_id: str) -> list[InsightItem] | None:
    """Fetches this user's own transactions (last TRANSACTION_WINDOW_DAYS
    days, id_pengguna-scoped) and SAW-ranked goals (reusing
    fetch_and_rank_goals — never requeried separately), assembles the prompt,
    and returns gemini_service.generate_insight's result verbatim."""
    supabase = get_supabase_admin()
    all_transactions = (
        supabase.table("transaksi")
        .select("*")
        .eq("id_pengguna", user_id)
        .execute()
    ).data

    cutoff = datetime.now(timezone.utc).date() - timedelta(
        days=TRANSACTION_WINDOW_DAYS
    )
    recent_transactions = [
        t for t in all_transactions if _to_date(t["tanggal_transaksi"]) >= cutoff
    ]

    ranked_goals = fetch_and_rank_goals(user_id)

    prompt = INSIGHT_PROMPT_TEMPLATE.format(
        window_days=TRANSACTION_WINDOW_DAYS,
        transactions=json.dumps(recent_transactions, default=str),
        goals=json.dumps(ranked_goals, default=str),
    )

    return await generate_insight(prompt)
