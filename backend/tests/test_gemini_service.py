"""Unit tests for backend/services/gemini_service.py.

Every Gemini call in this file goes through the `fake_gemini_response`
fixture's stub (backend/tests/conftest.py) — no test imports google.genai
directly or hits a real network endpoint.

Async functions are driven via plain `asyncio.run(...)` inside ordinary
sync test functions rather than pulling in the `pytest-asyncio` plugin —
this project has no async test infrastructure yet and `asyncio.run` needs
no new dependency (deliberate, see 03-01-SUMMARY.md).
"""

import asyncio
import json

from backend.models.insight import InsightItem
from backend.models.receipt import ReceiptExtraction
from backend.models.statement import StatementExtractionList
from backend.services import gemini_service


RECEIPT_JSON = json.dumps(
    {
        "merchant": "Indomaret",
        "nominal": 27500,
        "tanggal_transaksi": "2026-06-27",
        "items": ["Aqua 600ml"],
        "suggested_category_id": "cat-1",
    }
)

STATEMENT_JSON = json.dumps(
    {
        "transactions": [
            {
                "temp_id": "t1",
                "tanggal_transaksi": "2026-06-27",
                "deskripsi": "TRANSFER MASUK",
                "nominal": 750000,
                "tipe_transaksi": "Pemasukan",
                "suggested_category_id": "cat-2",
                "is_possible_duplicate": False,
            }
        ]
    }
)

INSIGHT_JSON = json.dumps(
    [
        {
            "id": "i1",
            "message": "Side income kamu bulan ini bisa nutup 60% goal Laptop.",
            "action_verb": "Alokasikan",
            "related_goal_id": "g1",
            "related_category_id": None,
            "generated_at": "2026-07-09T10:00:00Z",
        }
    ]
)


class TestExtractReceipt:
    def test_returns_receipt_extraction_on_success(self, fake_gemini_response):
        fake_gemini_response(text=RECEIPT_JSON)

        result = asyncio.run(gemini_service.extract_receipt(b"fake-image-bytes", "image/jpeg"))

        assert isinstance(result, ReceiptExtraction)
        assert result.merchant == "Indomaret"
        assert result.nominal == 27500

    def test_returns_none_on_timeout(self, fake_gemini_response):
        fake_gemini_response(exception=asyncio.TimeoutError())

        result = asyncio.run(gemini_service.extract_receipt(b"fake-image-bytes", "image/jpeg"))

        assert result is None

    def test_returns_none_on_any_other_exception_no_retry(self, fake_gemini_response):
        fake = fake_gemini_response(exception=Exception("rate limited"))

        result = asyncio.run(gemini_service.extract_receipt(b"fake-image-bytes", "image/jpeg"))

        assert result is None
        # no auto-retry (D-01): exactly one call attempted
        assert len(fake.models.calls) == 1

    def test_uses_10_second_timeout(self, fake_gemini_response, spy_wait_for_timeout):
        fake_gemini_response(text=RECEIPT_JSON)

        asyncio.run(gemini_service.extract_receipt(b"fake-image-bytes", "image/jpeg"))

        assert spy_wait_for_timeout["timeout"] == 10.0


class TestExtractStatement:
    def test_returns_statement_extraction_list_on_success(self, fake_gemini_response):
        fake_gemini_response(text=STATEMENT_JSON)

        result = asyncio.run(gemini_service.extract_statement(b"fake-pdf-bytes"))

        assert isinstance(result, StatementExtractionList)
        assert len(result.transactions) == 1
        assert result.transactions[0].nominal == 750000

    def test_returns_none_on_timeout(self, fake_gemini_response):
        fake_gemini_response(exception=asyncio.TimeoutError())

        result = asyncio.run(gemini_service.extract_statement(b"fake-pdf-bytes"))

        assert result is None

    def test_returns_none_on_any_other_exception(self, fake_gemini_response):
        fake_gemini_response(exception=Exception("rate limited"))

        result = asyncio.run(gemini_service.extract_statement(b"fake-pdf-bytes"))

        assert result is None


class TestGenerateInsight:
    def test_returns_list_of_insight_items_on_success(self, fake_gemini_response):
        fake_gemini_response(text=INSIGHT_JSON)

        result = asyncio.run(gemini_service.generate_insight("prompt text"))

        assert isinstance(result, list)
        assert len(result) == 1
        assert isinstance(result[0], InsightItem)
        assert result[0].action_verb == "Alokasikan"

    def test_returns_none_on_timeout(self, fake_gemini_response):
        fake_gemini_response(exception=asyncio.TimeoutError())

        result = asyncio.run(gemini_service.generate_insight("prompt text"))

        assert result is None

    def test_returns_none_on_any_other_exception(self, fake_gemini_response):
        fake_gemini_response(exception=Exception("rate limited"))

        result = asyncio.run(gemini_service.generate_insight("prompt text"))

        assert result is None

    def test_uses_15_second_timeout(self, fake_gemini_response, spy_wait_for_timeout):
        fake_gemini_response(text=INSIGHT_JSON)

        asyncio.run(gemini_service.generate_insight("prompt text"))

        assert spy_wait_for_timeout["timeout"] == 15.0
