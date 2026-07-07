"""Pydantic models for Smart Allocation (02-12-PLAN.md).

Shapes mirror API_CONTRACT.md §7 exactly. The suggestion GET
(`GET /transactions/{id}/allocation-suggestion`) intentionally has no
dedicated response model here — like `goals.py`/`goal_service.py`, it
returns a plain dict (`{"has_active_goal": False}` or the full suggestion
shape), since the two response shapes are structurally different and a
single Pydantic model would force optional fields everywhere.
"""

from pydantic import BaseModel, Field


class AllocationConfirmRequest(BaseModel):
    transaksi_id: str
    goal_id: str
    nominal_alokasi: int = Field(gt=0)


class GoalUpdated(BaseModel):
    id_goal: str
    nominal_terkumpul: int
    progress_pct: int


class AllocationConfirmResponse(BaseModel):
    id_alokasi: str
    nominal_alokasi: int
    tanggal_alokasi: str
    goal_updated: GoalUpdated


class AllocationSkipResponse(BaseModel):
    status: str
    pending_until: str


class AllocationPending(BaseModel):
    transaksi_id: str
    nominal: int
    # Optional: a user with 0 active goals can still have a pending
    # side-income transaction (no goal to suggest yet) — never crash here,
    # matches allocation_service.get_allocation_suggestion's
    # has_active_goal=False case (Rule 2 robustness).
    suggested_goal_name: str | None = None
    expires_at: str


class AllocationPendingResponse(BaseModel):
    pending: list[AllocationPending]
