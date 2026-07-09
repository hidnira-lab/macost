from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.goal_settings import GoalSettingsUpdate
from backend.services.goal_settings_service import get_or_create_goal_settings
from backend.services.goal_service import fetch_and_rank_goals
from backend.services import saw_engine
from backend.routers.goals import _to_response

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/goal-settings — get-or-create default, never a 404
# ---------------------------------------------------------------------------

@router.get("/goal-settings", response_model=dict)
def get_goal_settings(current_user_id: str = Depends(get_current_user_id)):
    row = get_or_create_goal_settings(current_user_id)
    return {"strategy": row["strategy"], "weights": row["weights"]}


# ---------------------------------------------------------------------------
# PUT /api/goal-settings — weight-sum validated, structured 400 (not bare 422)
# ---------------------------------------------------------------------------

@router.put("/goal-settings", response_model=dict)
def update_goal_settings(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Body is accepted as a raw `dict` (not `GoalSettingsUpdate` directly) so
    that the weight-sum `field_validator`'s `ValueError` can be caught here
    and re-raised as this project's structured `400 VALIDATION_ERROR` shape
    (CLAUDE.md prescribed error format) instead of FastAPI's default bare 422.

    Stores `strategy`/`weights` verbatim — never applies TC-01 strategy
    multipliers here (those are internal-only to `saw_engine.rank_goals`,
    per D-05).
    """
    try:
        validated = GoalSettingsUpdate(**body)
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "weights must sum to 1.0",
                }
            },
        )

    # Ensure a row exists first (get-or-create), so PUT never 404s for a
    # brand-new user either.
    get_or_create_goal_settings(current_user_id)

    supabase = get_supabase_admin()
    result = (
        supabase.table("goal_settings")
        .update({"strategy": validated.strategy, "weights": validated.weights.model_dump()})
        .eq("id_pengguna", current_user_id)
        .execute()
    )

    row = result.data[0]
    return {"strategy": row["strategy"], "weights": row["weights"]}


# ---------------------------------------------------------------------------
# POST /api/goal-settings/preview — re-rank goals with candidate (unsaved)
# weights, reusing saw_engine.rank_goals + _to_response(). Never persists.
# ---------------------------------------------------------------------------

@router.post("/goal-settings/preview", response_model=dict)
def preview_goal_settings(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Accepts candidate `strategy` + `weights`, validates them with the same
    ±0.002 tolerance as PUT, fetches the user's goals with all derived fields
    via `fetch_and_rank_goals()`, strips their ranks, re-ranks with the
    candidate weights via `saw_engine.rank_goals()`, and returns the result
    in the same shape as GET /api/goals.

    NEVER persists — subsequent GET /api/goal-settings returns the stored
    weights unchanged.
    """
    try:
        validated = GoalSettingsUpdate(**body)
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "weights must sum to 1.0",
                }
            },
        )

    # Fetch enriched goals (with derived fields) using stored settings, then
    # re-rank with candidate weights — avoiding a second aggregation impl.
    enriched_goals = fetch_and_rank_goals(current_user_id)

    # Strip rank from each goal so re-ranking is clean
    unranked_goals = [
        {k: v for k, v in g.items() if k != "rank"} for g in enriched_goals
    ]

    # Re-rank with candidate weights
    candidate_weights = validated.weights.model_dump()
    ranked_goals = saw_engine.rank_goals(
        unranked_goals, candidate_weights, validated.strategy
    )

    return {"goals": [_to_response(g) for g in ranked_goals]}
