from fastapi import APIRouter, Depends, Query

from backend.dependencies.auth import get_current_user_id
from backend.services.dashboard_service import compute_dashboard

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/dashboard — 5 KPIs in fixed research-validated order, period filter
# (API_CONTRACT.md §8 / FR-006)
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=dict)
def get_dashboard(
    period: str = Query("this_month"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    return compute_dashboard(
        current_user_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
