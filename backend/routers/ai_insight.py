from fastapi import APIRouter, Depends

from backend.dependencies.auth import get_current_user_id
from backend.services.insight_service import generate_user_insights

router = APIRouter()


@router.get("/ai-insight", response_model=dict)
async def get_ai_insight(current_user_id: str = Depends(get_current_user_id)):
    """
    AIINS-01/02/03: delegates to insight_service.generate_user_insights,
    which already enforces the 15s Gemini timeout internally (03-01) — this
    route never blocks past that ceiling and never re-wraps it. A None
    result (timeout/failure) becomes the locked fallback shape, never a 500.
    """
    result = await generate_user_insights(current_user_id)

    if result is None:
        return {
            "insight_available": False,
            "fallback_message": (
                "Insight belum bisa dibuat sekarang. Sementara itu, cek "
                "progres tabunganmu di halaman Goals."
            ),
        }

    return {
        "insight_available": True,
        "insights": [item.model_dump() for item in result],
    }
