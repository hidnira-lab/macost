from datetime import date, datetime, timezone

from pydantic import BaseModel, Field, field_validator


class GoalCreate(BaseModel):
    nama_goal: str
    nominal_target: int = Field(gt=0)
    deadline: date
    skor_keinginan: int = Field(ge=1, le=5)

    @field_validator("deadline")
    @classmethod
    def validate_deadline_future(cls, v: date) -> date:
        """Sitemap #14: "deadline harus di masa depan" — not previously
        enforced anywhere in the repo (02-RESEARCH.md V5 note). Uses
        `datetime.now(timezone.utc).date()` rather than a bare
        `date.today()` to avoid server-timezone drift (Pitfall 8)."""
        today = datetime.now(timezone.utc).date()
        if v <= today:
            raise ValueError("deadline must be in the future")
        return v


class GoalUpdate(GoalCreate):
    """Same shape as `GoalCreate` — edit uses the same validated fields."""


class GoalResponse(BaseModel):
    id_goal: str
    nama_goal: str
    nominal_target: int
    deadline: str
    skor_keinginan: int
    # Server-computed only — never accepted on write (T-2-02).
    nominal_terkumpul: int
    skor_kepentingan: int
    progress_pct: int
    rank: int


class GoalDetailResponse(GoalResponse):
    allocation_history: list[dict]
