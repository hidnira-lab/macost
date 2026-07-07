"""Unit tests for backend/services/saw_engine.py — pure SAW ranking engine.

Covers SAW-01 (known ranking order), SAW-02 (0/1/identical-goal edge cases),
SAW-03 (strategy toggle re-weighting) per 02-04-PLAN.md. No Supabase/IO — the
module under test is a pure function operating on already-validated dicts.
"""

from datetime import date, timedelta

import pytest

from backend.services import saw_engine
from backend.services.saw_engine import (
    STRATEGY_MULTIPLIERS,
    compute_skor_kepentingan,
    normalize_benefit,
    normalize_cost,
    rank_goals,
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


# ---------------------------------------------------------------------------
# rank_goals — fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def ranked_goal_inputs(sample_goals):
    """conftest.py's sample_goals, augmented with `saving_capacity_raw` and
    `skor_kepentingan` — both are pre-computed by the caller (goal_service.py)
    before rank_goals ever sees a goal dict (TC-03; and by the same pattern,
    urgency's raw value is expected pre-computed too, per this plan's Task 2
    action step 4).

    Order (matches conftest.py sample_goals): Beli Laptop, Dana Darurat, Liburan.
    """
    extra = [
        {"saving_capacity_raw": 0.5, "skor_kepentingan": 5},  # Beli Laptop
        {"saving_capacity_raw": 0.3, "skor_kepentingan": 1},  # Dana Darurat
        {"saving_capacity_raw": 0.9, "skor_kepentingan": 1},  # Liburan
    ]
    return [{**g, **e} for g, e in zip(sample_goals, extra)]


# ---------------------------------------------------------------------------
# rank_goals — SAW-02 edge case guards
# ---------------------------------------------------------------------------

class TestRankGoalsEdgeCases:
    def test_zero_goals_returns_empty_list(self, sample_weights):
        assert rank_goals([], sample_weights) == []

    def test_single_goal_returns_rank_one_without_normalizing(
        self, monkeypatch, sample_weights
    ):
        def _boom(*_args, **_kwargs):
            raise AssertionError(
                "normalization must not run for a single-goal input (SAW-02)"
            )

        monkeypatch.setattr(saw_engine, "normalize_benefit", _boom)
        monkeypatch.setattr(saw_engine, "normalize_cost", _boom)

        goal = {
            "id_goal": "only-goal",
            "nominal_target": 1_000_000,
            "nominal_terkumpul": 200_000,
            "skor_keinginan": 4,
            "saving_capacity_raw": 0.4,
            "skor_kepentingan": 3,
            "created_at": "2026-06-01T00:00:00Z",
        }

        result = rank_goals([goal], sample_weights)

        assert result == [{**goal, "rank": 1}]

    def test_identical_criteria_values_produce_stable_tie_break(
        self, sample_weights
    ):
        """Two goals with every criterion identical must not crash, and must
        be ordered deterministically by created_at ascending (oldest first)."""
        goal_older = {
            "id_goal": "goal-older",
            "nominal_target": 2_000_000,
            "nominal_terkumpul": 1_000_000,
            "skor_keinginan": 3,
            "saving_capacity_raw": 0.5,
            "skor_kepentingan": 3,
            "created_at": "2026-01-01T00:00:00Z",
        }
        goal_newer = {
            **goal_older,
            "id_goal": "goal-newer",
            "created_at": "2026-02-01T00:00:00Z",
        }

        result = rank_goals([goal_newer, goal_older], sample_weights)

        assert [g["id_goal"] for g in result] == ["goal-older", "goal-newer"]
        assert [g["rank"] for g in result] == [1, 2]

    def test_does_not_mutate_input_list_or_weights(self, sample_weights):
        goals = [
            {
                "id_goal": "goal-a",
                "nominal_target": 2_000_000,
                "nominal_terkumpul": 1_000_000,
                "skor_keinginan": 3,
                "saving_capacity_raw": 0.5,
                "skor_kepentingan": 3,
                "created_at": "2026-01-01T00:00:00Z",
            },
            {
                "id_goal": "goal-b",
                "nominal_target": 1_000_000,
                "nominal_terkumpul": 500_000,
                "skor_keinginan": 4,
                "saving_capacity_raw": 0.6,
                "skor_kepentingan": 2,
                "created_at": "2026-01-02T00:00:00Z",
            },
        ]
        goals_snapshot = [dict(g) for g in goals]
        weights_snapshot = dict(sample_weights)

        rank_goals(goals, sample_weights, strategy="importance_first")

        assert goals == goals_snapshot
        assert sample_weights == weights_snapshot


# ---------------------------------------------------------------------------
# rank_goals — STRATEGY_MULTIPLIERS (TC-01)
# ---------------------------------------------------------------------------

class TestStrategyMultipliers:
    def test_has_both_strategy_keys(self):
        assert set(STRATEGY_MULTIPLIERS.keys()) == {"quick_win", "importance_first"}

    def test_quick_win_multiplier_table(self):
        assert STRATEGY_MULTIPLIERS["quick_win"] == {
            "personal_importance": 0.7,
            "progress_gap": 2.0,
            "saving_capacity": 1.5,
            "urgency": 0.7,
            "target_amount": 1.0,
        }

    def test_importance_first_multiplier_table(self):
        assert STRATEGY_MULTIPLIERS["importance_first"] == {
            "personal_importance": 2.0,
            "progress_gap": 0.7,
            "saving_capacity": 0.7,
            "urgency": 2.0,
            "target_amount": 1.0,
        }


# ---------------------------------------------------------------------------
# rank_goals — SAW-01 known order + SAW-03 strategy toggle (TC-01)
# ---------------------------------------------------------------------------

class TestRankGoalsKnownOrderAndStrategyToggle:
    def test_quick_win_known_order(self, ranked_goal_inputs, sample_weights):
        result = rank_goals(ranked_goal_inputs, sample_weights, strategy="quick_win")
        assert [g["id_goal"] for g in result] == [
            "33333333-3333-3333-3333-333333333333",  # Liburan
            "11111111-1111-1111-1111-111111111111",  # Beli Laptop
            "22222222-2222-2222-2222-222222222222",  # Dana Darurat
        ]

    def test_importance_first_known_order(self, ranked_goal_inputs, sample_weights):
        result = rank_goals(
            ranked_goal_inputs, sample_weights, strategy="importance_first"
        )
        assert [g["id_goal"] for g in result] == [
            "11111111-1111-1111-1111-111111111111",  # Beli Laptop
            "33333333-3333-3333-3333-333333333333",  # Liburan
            "22222222-2222-2222-2222-222222222222",  # Dana Darurat
        ]

    def test_strategy_toggle_changes_order(self, ranked_goal_inputs, sample_weights):
        """SAW-03: toggling strategy on the SAME input weights/goals must
        produce a genuinely different order (top-ranked goal changes)."""
        quick_win_order = [
            g["id_goal"]
            for g in rank_goals(ranked_goal_inputs, sample_weights, strategy="quick_win")
        ]
        importance_first_order = [
            g["id_goal"]
            for g in rank_goals(
                ranked_goal_inputs, sample_weights, strategy="importance_first"
            )
        ]
        assert quick_win_order != importance_first_order
        assert quick_win_order[0] != importance_first_order[0]


# ---------------------------------------------------------------------------
# rank_goals — TC-04: target_amount is a BENEFIT criterion
# ---------------------------------------------------------------------------

class TestTargetAmountIsBenefit:
    def test_larger_target_scores_at_least_as_high_all_else_equal(
        self, sample_weights
    ):
        """A larger nominal_target must score >= a smaller one when every
        other criterion is held equal (same progress fraction, same
        skor_keinginan/saving_capacity_raw/skor_kepentingan) — proves
        target_amount is normalized via normalize_benefit, not
        normalize_cost (TC-04)."""
        goal_small_target = {
            "id_goal": "goal-small-target",
            "nominal_target": 1_000_000,
            "nominal_terkumpul": 500_000,  # 50% progress
            "skor_keinginan": 3,
            "saving_capacity_raw": 0.5,
            "skor_kepentingan": 3,
            "created_at": "2026-01-01T00:00:00Z",
        }
        goal_large_target = {
            **goal_small_target,
            "id_goal": "goal-large-target",
            "nominal_target": 2_000_000,
            "nominal_terkumpul": 1_000_000,  # same 50% progress
            "created_at": "2026-01-02T00:00:00Z",
        }

        result = rank_goals(
            [goal_small_target, goal_large_target], sample_weights
        )

        assert result[0]["id_goal"] == "goal-large-target"
        assert result[0]["rank"] == 1
