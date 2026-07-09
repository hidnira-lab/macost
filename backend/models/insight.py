from typing import Literal

from pydantic import BaseModel, model_validator


class InsightItem(BaseModel):
    """Gemini structured-output schema for GET /api/ai-insight (AIINS-02).

    `action_verb` is a closed 3-value vocabulary per AIINS-02 and the
    UI-SPEC.md badge color map — never a free string.

    `require_one_related_target` mirrors `backend/models/goal_settings.py`'s
    validator philosophy (raise `ValueError` at the model layer, let the
    caller translate it into a structured response, never let it surface as
    a raw 500) to enforce RESEARCH.md Pitfall 4 / D-03: every insight must
    link to a goal or a category — Gemini's `response_schema` constrains
    field types but not this cross-field invariant, so it must be enforced
    here.
    """

    id: str
    message: str
    action_verb: Literal["Alokasikan", "Kurangi", "Pertimbangkan"]
    related_goal_id: str | None = None
    related_category_id: str | None = None
    generated_at: str

    @model_validator(mode="after")
    def require_one_related_target(self) -> "InsightItem":
        if self.related_goal_id is None and self.related_category_id is None:
            raise ValueError("insight must link to a goal or category")
        return self
