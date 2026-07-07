"""Goal Settings service — get-or-create-default (02-10-PLAN.md Task 1).

Persists the SAW strategy/weights for a user. `DEFAULT_WEIGHTS` are the
locked survey-derived weights (CLAUDE.md rule 3, n=62). Strategy re-weighting
(TC-01) is internal-only to `saw_engine.rank_goals` — this module never
mutates the weights it stores/returns.
"""

from backend.core.supabase import get_supabase_admin

DEFAULT_WEIGHTS = {
    "personal_importance": 0.225,
    "progress_gap": 0.219,
    "saving_capacity": 0.215,
    "urgency": 0.178,
    "target_amount": 0.162,
}


def get_or_create_goal_settings(user_id: str) -> dict:
    """Returns the user's goal_settings row, auto-creating a default one
    (`strategy='quick_win'`, `DEFAULT_WEIGHTS`) on first read. Never a 404 —
    a brand-new user always gets a usable row back."""
    supabase = get_supabase_admin()
    rows = (
        supabase.table("goal_settings")
        .select("*")
        .eq("id_pengguna", user_id)
        .execute()
        .data
    )
    if rows:
        return rows[0]

    inserted = (
        supabase.table("goal_settings")
        .insert(
            {
                "id_pengguna": user_id,
                "strategy": "quick_win",
                "weights": DEFAULT_WEIGHTS,
            }
        )
        .execute()
        .data
    )
    return inserted[0]
