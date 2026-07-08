from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class GoalSettingsWeights(BaseModel):
    """5 SAW criteria weights — must sum to 1.0 (validated at the
    `GoalSettingsUpdate.weights` level, see below, per D-05/Pitfall 7).

    `extra="forbid"` + all 5 fields required means Pydantic rejects any
    incoming dict that is missing a real key, has a typo'd key standing in
    for a real one, or has a genuinely extra key — since exactly these 5
    keys are the only ones `saw_engine.rank_goals` ever reads."""

    model_config = ConfigDict(extra="forbid")

    personal_importance: float
    progress_gap: float
    saving_capacity: float
    urgency: float
    target_amount: float


class GoalSettingsUpdate(BaseModel):
    strategy: Literal["quick_win", "importance_first"]
    weights: GoalSettingsWeights

    @field_validator("weights")
    @classmethod
    def validate_weight_sum(cls, v: GoalSettingsWeights) -> GoalSettingsWeights:
        """Pitfall 7: floating-point weight-sum validation — never a bare
        `== 1.0` equality check.

        Tolerance is 0.002 (not the originally-proposed 0.001): CLAUDE.md's
        locked default weights (22.5/21.9/21.5/17.8/16.2%) are themselves a
        real, deterministic 99.9% sum (0.999, not floating-point dust) —
        a one-decimal rounding artifact of the underlying n=62 survey
        percentages, not a bug in this validator. A 0.001 tolerance would
        reject the exact default weights being re-sent verbatim (e.g. via
        the D-05 strategy-toggle flow, which resends the same weights
        unchanged) — precisely the false-positive this doc's own Pitfall 7
        "Warning signs" section calls out. 0.002 still rejects any
        materially wrong weight set (e.g. summing to 0.95) while accepting
        this known 0.1% rounding artifact.
        """
        if abs(sum(v.model_dump().values()) - 1.0) >= 0.002:
            raise ValueError("weights must sum to 1.0")
        return v


class GoalSettingsResponse(BaseModel):
    strategy: str
    weights: dict[str, float]
