from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.goal_settings import GoalSettingsUpdate
from backend.services.goal_settings_service import get_or_create_goal_settings

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
        .update({"strategy": validated.strategy, "weights": validated.weights})
        .eq("id_pengguna", current_user_id)
        .execute()
    )

    row = result.data[0]
    return {"strategy": row["strategy"], "weights": row["weights"]}
