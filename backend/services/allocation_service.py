"""Allocation suggestion computation (02-12-PLAN.md Task 1).

Reuses `goal_service.fetch_and_rank_goals()` — the single shared SAW-ranking
entry point (see `goal_service.py`'s own docstring) — rather than
duplicating any ranking logic here.
"""

from backend.services import goal_service

# Fixed default suggestion percentage (Assumption A5, 02-RESEARCH.md) —
# within the locked 29-40% ALLOC-02 range. Not user-configurable in MVP.
SUGGESTED_PCT = 35


def get_allocation_suggestion(transaction: dict, user_id: str) -> dict:
    """Returns the Smart Allocation suggestion for `transaction`.

    Shape matches API_CONTRACT.md §7 exactly:
      - No active goals -> {"has_active_goal": False}
      - Otherwise -> full suggestion shape, top-ranked goal +
        up to 2 alternative_goals (rank 2 and 3).
    """
    goals = goal_service.fetch_and_rank_goals(user_id)
    if not goals:
        return {"has_active_goal": False}

    top_goal = goals[0]
    suggested_amount = round(transaction["nominal"] * SUGGESTED_PCT / 100)

    return {
        "has_active_goal": True,
        "suggested_goal_id": top_goal["id_goal"],
        "suggested_goal_name": top_goal["nama_goal"],
        "suggested_amount": suggested_amount,
        "suggested_pct": SUGGESTED_PCT,
        "alternative_goals": [
            {"goal_id": g["id_goal"], "goal_name": g["nama_goal"], "rank": g["rank"]}
            for g in goals[1:3]
        ],
    }
