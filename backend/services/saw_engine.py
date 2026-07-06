"""Pure SAW (Simple Additive Weighting) goal-ranking engine.

No Supabase/IO dependency — every function here operates only on
already-validated in-memory data assembled by its caller (per this plan's
threat model: T-2-04, defense-in-depth division guards).

See .planning/phases/02-core-product-loop/02-RESEARCH.md ("SAW Engine — Core
Algorithm", "Team-Confirmed Decisions" TC-01..TC-04) for the formulas this
module implements.
"""

from datetime import date, datetime, timezone


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
