import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from backend.core.supabase import get_supabase_admin
from backend.dependencies.auth import get_current_user_id
from backend.models.goal import GoalCreate, GoalUpdate
from backend.services.goal_service import fetch_and_rank_goals

router = APIRouter()


def _to_response(goal: dict) -> dict:
    return {
        "id_goal": str(goal["id_goal"]),
        "nama_goal": goal["nama_goal"],
        "nominal_target": goal["nominal_target"],
        "deadline": str(goal["deadline"]),
        "skor_keinginan": goal["skor_keinginan"],
        "nominal_terkumpul": goal["nominal_terkumpul"],
        "skor_kepentingan": goal["skor_kepentingan"],
        "progress_pct": goal["progress_pct"],
        "rank": goal["rank"],
    }


def _goal_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "NOT_FOUND", "message": "Goal tidak ditemukan"}},
    )


# ---------------------------------------------------------------------------
# POST /api/goals — create, response is always consistent with GET (T-2-02)
# ---------------------------------------------------------------------------

@router.post("/goals", status_code=status.HTTP_201_CREATED)
def create_goal(body: GoalCreate, current_user_id: str = Depends(get_current_user_id)):
    """
    `rank`/`progress_pct`/`nominal_terkumpul`/`skor_kepentingan` are never
    accepted on write (T-2-02) — `GoalCreate` structurally excludes them.
    After insert, the created goal is looked up via `fetch_and_rank_goals`
    so the response is always internally consistent with what GET would show.
    """
    supabase = get_supabase_admin()
    new_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    insert_payload = {
        "id_goal": new_id,
        "id_pengguna": current_user_id,
        "nama_goal": body.nama_goal,
        "nominal_target": body.nominal_target,
        "deadline": body.deadline.isoformat(),
        "skor_keinginan": body.skor_keinginan,
        "created_at": created_at,
    }
    supabase.table("goal").insert(insert_payload).execute()

    goals = fetch_and_rank_goals(current_user_id)
    created = next(g for g in goals if g["id_goal"] == new_id)
    return _to_response(created)


# ---------------------------------------------------------------------------
# GET /api/goals — real-time SAW-ranked list, batched aggregation
# ---------------------------------------------------------------------------

@router.get("/goals", response_model=dict)
def list_goals(current_user_id: str = Depends(get_current_user_id)):
    goals = fetch_and_rank_goals(current_user_id)
    return {"goals": [_to_response(g) for g in goals]}


# ---------------------------------------------------------------------------
# GET /api/goals/{id} — detail + allocation_history
# ---------------------------------------------------------------------------

@router.get("/goals/{goal_id}", response_model=dict)
def get_goal(goal_id: str, current_user_id: str = Depends(get_current_user_id)):
    goals = fetch_and_rank_goals(current_user_id)
    matching = [g for g in goals if g["id_goal"] == goal_id]
    if not matching:
        raise _goal_not_found()
    goal = matching[0]

    supabase = get_supabase_admin()
    allocation_history = (
        supabase.table("alokasi").select("*").eq("goal_id", goal_id).execute().data
    )

    return {**_to_response(goal), "allocation_history": allocation_history}


# ---------------------------------------------------------------------------
# PUT /api/goals/{id} — same double-.eq() IDOR-safe pattern as wallets.py
# ---------------------------------------------------------------------------

@router.put("/goals/{goal_id}")
def update_goal(
    goal_id: str,
    body: GoalUpdate,
    current_user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase_admin()
    result = (
        supabase.table("goal")
        .update(
            {
                "nama_goal": body.nama_goal,
                "nominal_target": body.nominal_target,
                "deadline": body.deadline.isoformat(),
                "skor_keinginan": body.skor_keinginan,
            }
        )
        .eq("id_goal", goal_id)
        .eq("id_pengguna", current_user_id)
        .execute()
    )

    if not result.data:
        raise _goal_not_found()

    goals = fetch_and_rank_goals(current_user_id)
    updated = next(g for g in goals if g["id_goal"] == goal_id)
    return _to_response(updated)


# ---------------------------------------------------------------------------
# DELETE /api/goals/{id} — blocked if alokasi rows exist (Pitfall 10)
# ---------------------------------------------------------------------------

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Checks for existing `alokasi` rows BEFORE issuing any delete call — a
    goal with allocation history is never silently cascaded (Pitfall 10).
    """
    supabase = get_supabase_admin()

    existing_alokasi = (
        supabase.table("alokasi").select("id_alokasi").eq("goal_id", goal_id).execute().data
    )
    if existing_alokasi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "GOAL_HAS_ALLOCATIONS",
                    "message": "Goal ini punya riwayat alokasi, tidak bisa dihapus",
                }
            },
        )

    supabase.table("goal").delete().eq("id_goal", goal_id).eq(
        "id_pengguna", current_user_id
    ).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
