"""Fast, no-IO unit tests for the Pydantic response schemas added in
03-01-PLAN.md Task 1 (InsightItem, ReceiptExtraction, StatementTransaction).

Separate from test_gemini_service.py (Task 2), which covers the service
layer that actually calls Gemini.
"""

import pytest
from pydantic import ValidationError

from backend.models.insight import InsightItem
from backend.models.receipt import ReceiptExtraction
from backend.models.statement import StatementTransaction


class TestInsightItem:
    def test_rejects_both_related_fields_null(self):
        with pytest.raises(ValidationError):
            InsightItem(
                id="i1",
                message="m",
                action_verb="Alokasikan",
                related_goal_id=None,
                related_category_id=None,
                generated_at="2026-07-09T10:00:00Z",
            )

    def test_constructs_with_related_goal_id_only(self):
        item = InsightItem(
            id="i1",
            message="m",
            action_verb="Alokasikan",
            related_goal_id="g1",
            related_category_id=None,
            generated_at="2026-07-09T10:00:00Z",
        )
        assert item.related_goal_id == "g1"
        assert item.related_category_id is None

    def test_constructs_with_related_category_id_only(self):
        item = InsightItem(
            id="i1",
            message="m",
            action_verb="Alokasikan",
            related_goal_id=None,
            related_category_id="c1",
            generated_at="2026-07-09T10:00:00Z",
        )
        assert item.related_category_id == "c1"
        assert item.related_goal_id is None

    def test_rejects_action_verb_outside_closed_enum(self):
        with pytest.raises(ValidationError):
            InsightItem(
                id="i1",
                message="m",
                action_verb="Nonsense",
                related_goal_id="g1",
                related_category_id=None,
                generated_at="2026-07-09T10:00:00Z",
            )


class TestReceiptExtraction:
    def test_constructs_matching_api_contract_success_shape(self):
        receipt = ReceiptExtraction(
            merchant="Indomaret",
            nominal=27500,
            tanggal_transaksi="2026-06-27",
            items=["Aqua 600ml"],
            suggested_category_id="cat-1",
        )
        assert receipt.merchant == "Indomaret"
        assert receipt.nominal == 27500
        assert receipt.tanggal_transaksi == "2026-06-27"
        assert receipt.items == ["Aqua 600ml"]
        assert receipt.suggested_category_id == "cat-1"

    def test_rejects_zero_nominal(self):
        with pytest.raises(ValidationError):
            ReceiptExtraction(merchant="X", nominal=0, tanggal_transaksi="2026-06-27")


class TestStatementTransaction:
    def test_constructs_with_is_possible_duplicate_defaulting_false(self):
        tx = StatementTransaction(
            temp_id="t1",
            tanggal_transaksi="2026-06-27",
            deskripsi="TRANSFER MASUK",
            nominal=750000,
            tipe_transaksi="Pemasukan",
            suggested_category_id="cat-2",
        )
        assert tx.is_possible_duplicate is False
        assert tx.temp_id == "t1"
        assert tx.nominal == 750000
