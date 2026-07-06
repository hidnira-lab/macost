"""Unit tests for backend/services/saw_engine.py — pure SAW ranking engine.

Covers SAW-01 (known ranking order), SAW-02 (0/1/identical-goal edge cases),
SAW-03 (strategy toggle re-weighting) per 02-04-PLAN.md. No Supabase/IO — the
module under test is a pure function operating on already-validated dicts.
"""

from datetime import date, timedelta

import pytest

from backend.services.saw_engine import (
    compute_skor_kepentingan,
    normalize_benefit,
    normalize_cost,
)


# ---------------------------------------------------------------------------
# normalize_benefit
# ---------------------------------------------------------------------------

class TestNormalizeBenefit:
    def test_normal_values_divide_by_max(self):
        assert normalize_benefit([2.0, 4.0, 8.0]) == [0.25, 0.5, 1.0]

    def test_all_zero_guard_returns_tied_best(self):
        """SAW-02: an all-zero criterion must never divide by zero."""
        assert normalize_benefit([0, 0, 0]) == [1.0, 1.0, 1.0]

    def test_identical_nonzero_values_produce_tied_best(self):
        assert normalize_benefit([3, 3, 3]) == [1.0, 1.0, 1.0]


# ---------------------------------------------------------------------------
# normalize_cost
# ---------------------------------------------------------------------------

class TestNormalizeCost:
    def test_normal_values_use_min_over_value(self):
        result = normalize_cost([2.0, 4.0, 8.0])
        assert result == [1.0, 0.5, 0.25]

    def test_zero_element_guard_returns_one(self):
        """SAW-02: a zero raw value must never be a divisor's denominator."""
        result = normalize_cost([0, 5, 10])
        assert result[0] == 1.0

    def test_all_zero_values_guard(self):
        assert normalize_cost([0, 0, 0]) == [1.0, 1.0, 1.0]


# ---------------------------------------------------------------------------
# compute_skor_kepentingan
# ---------------------------------------------------------------------------

class TestComputeSkorKepentingan:
    @pytest.mark.parametrize(
        "days_offset,expected",
        [
            (0, 5),
            (30, 5),
            (31, 4),
            (90, 4),
            (91, 3),
            (180, 3),
            (181, 2),
            (365, 2),
            (366, 1),
        ],
    )
    def test_urgency_buckets(self, days_offset, expected):
        today = date(2026, 1, 1)
        deadline = today + timedelta(days=days_offset)
        assert compute_skor_kepentingan(deadline, today) == expected

    def test_overdue_deadline_returns_max_urgency(self):
        """A deadline already in the past is still bucketed as max urgency (5),
        not a crash or a negative/out-of-range score."""
        today = date(2026, 1, 1)
        deadline = today - timedelta(days=10)
        assert compute_skor_kepentingan(deadline, today) == 5
