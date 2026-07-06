"""Pure SAW (Simple Additive Weighting) goal-ranking engine.

No Supabase/IO dependency — every function here operates only on
already-validated in-memory data assembled by its caller (per this plan's
threat model: T-2-04, defense-in-depth division guards).

See .planning/phases/02-core-product-loop/02-RESEARCH.md ("SAW Engine — Core
Algorithm", "Team-Confirmed Decisions" TC-01..TC-04) for the formulas this
module implements.
"""

from datetime import date, datetime, timezone

# TC-01 (locked): strategy re-weighting multipliers, applied to the *stored*
# weights then renormalized, computation-only inside rank_goals(). The
# `weights` dict passed into rank_goals (and anything persisted/returned by
# `/api/goal-settings`) must never be mutated or reflect these multipliers —
# only the internal `effective_weights` used for scoring do.
STRATEGY_MULTIPLIERS: dict[str, dict[str, float]] = {
    "quick_win": {
        "personal_importance": 0.7,
        "progress_gap": 2.0,
        "saving_capacity": 1.5,
        "urgency": 0.7,
        "target_amount": 1.0,
    },
    "importance_first": {
        "personal_importance": 2.0,
        "progress_gap": 0.7,
        "saving_capacity": 0.7,
        "urgency": 2.0,
        "target_amount": 1.0,
    },
}

# Criteria whose raw value is a "cost" (lower is better) vs "benefit" (higher
# is better). target_amount is a BENEFIT per TC-04 — larger goals score
# higher, not lower.
_COST_CRITERIA = {"progress_gap"}


def normalize_benefit(values: list[float]) -> list[float]:
    """Higher raw value = better. Classic SAW: x_ij / max(x_j).

    Guard (SAW-02): if every value is 0, there is no meaningful "best" value
    to divide by — treat the whole set as tied-best (all 1.0) rather than
    raising a ZeroDivisionError.
    """
    m = max(values)
    if m == 0:
        return [1.0 for _ in values]
    return [v / m for v in values]


def normalize_cost(values: list[float]) -> list[float]:
    """Lower raw value = better. Classic SAW: min(x_j) / x_ij.

    Guard (SAW-02): any individual value that is exactly 0 would be a
    divisor's denominator in the classic formula — return 1.0 (tied-best)
    for that element instead of raising a ZeroDivisionError.
    """
    m = min(values)
    return [1.0 if v == 0 else m / v for v in values]


def compute_skor_kepentingan(deadline: date, today: date | None = None) -> int:
    """Urgency score (1-5) derived from days remaining until `deadline`.

    TC-02 bucket thresholds (locked, do not change without team sign-off):
        days_remaining <= 30  -> 5 (also covers overdue/negative -> max urgency)
        days_remaining <= 90  -> 4
        days_remaining <= 180 -> 3
        days_remaining <= 365 -> 2
        else                  -> 1

    `today` defaults to `datetime.now(timezone.utc).date()` — never a bare
    `date.today()` — to avoid server-timezone drift (Pitfall 8).
    """
    if today is None:
        today = datetime.now(timezone.utc).date()
    days_remaining = (deadline - today).days
    if days_remaining <= 30:
        return 5
    elif days_remaining <= 90:
        return 4
    elif days_remaining <= 180:
        return 3
    elif days_remaining <= 365:
        return 2
    else:
        return 1


def _raw_criterion_values(goals: list[dict], criterion: str) -> list[float]:
    """Extracts the raw (pre-normalization) value of `criterion` for every
    goal, per the criteria table in 02-RESEARCH.md (post-TC-01/TC-04)."""
    if criterion == "personal_importance":
        return [g["skor_keinginan"] for g in goals]
    if criterion == "progress_gap":
        return [
            (g["nominal_target"] - g["nominal_terkumpul"]) / g["nominal_target"]
            for g in goals
        ]
    if criterion == "saving_capacity":
        # TC-03: the feasibility ratio is computed by the caller
        # (goal_service.py, requires a DB query for avg_monthly_side_income)
        # and is already present on each goal dict as `saving_capacity_raw`.
        return [g["saving_capacity_raw"] for g in goals]
    if criterion == "urgency":
        # Pre-computed by the caller via compute_skor_kepentingan() on every
        # read (Pitfall 6) — already present on each goal dict.
        return [g["skor_kepentingan"] for g in goals]
    if criterion == "target_amount":
        # TC-04: BENEFIT, not cost — larger nominal_target scores higher.
        return [g["nominal_target"] for g in goals]
    raise ValueError(f"Unknown SAW criterion: {criterion!r}")


def rank_goals(
    goals: list[dict], weights: dict, strategy: str = "quick_win"
) -> list[dict]:
    """Ranks `goals` by a 5-criteria weighted SAW score.

    Pure function: never mutates `goals` or `weights`. Returns a new list of
    goal dicts, each with a `rank` key added (1 = highest priority).

    SAW-02 edge case guards:
      - 0 goals -> [] (no crash)
      - 1 goal -> rank=1, no normalization call at all (nothing to compare)
      - identical criteria values across goals -> normalization guards
        produce a genuine, non-crashing tie; sorted deterministically by
        `created_at` ascending (oldest first)

    TC-01: `strategy` ("quick_win" | "importance_first") re-weights the
    criteria ONLY for this internal computation — `weights` itself (as
    stored/returned by `/api/goal-settings`) is never touched.
    """
    n = len(goals)
    if n == 0:
        return []
    if n == 1:
        return [{**goals[0], "rank": 1}]

    multipliers = STRATEGY_MULTIPLIERS[strategy]
    raw_effective = {k: v * multipliers[k] for k, v in weights.items()}
    multiplier_sum = sum(raw_effective.values())
    effective_weights = {k: v / multiplier_sum for k, v in raw_effective.items()}

    criteria = ["personal_importance", "progress_gap", "saving_capacity", "urgency", "target_amount"]
    normalized: dict[str, list[float]] = {}
    for criterion in criteria:
        raw_values = _raw_criterion_values(goals, criterion)
        if criterion in _COST_CRITERIA:
            normalized[criterion] = normalize_cost(raw_values)
        else:
            normalized[criterion] = normalize_benefit(raw_values)

    scored = []
    for i, goal in enumerate(goals):
        score = sum(
            normalized[criterion][i] * effective_weights[criterion]
            for criterion in criteria
        )
        scored.append((score, goal))

    # Sort by weighted score descending; tie-break by created_at ascending
    # (oldest goal wins ties) for a deterministic, explainable order.
    scored.sort(key=lambda pair: (-pair[0], pair[1]["created_at"]))

    ranked = []
    for rank, (_score, goal) in enumerate(scored, start=1):
        ranked.append({**goal, "rank": rank})
    return ranked
