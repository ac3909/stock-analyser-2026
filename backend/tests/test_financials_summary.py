"""Tests for the financial summary builder."""

from app.services.financials_summary import build_financials_summary


class TestBuildFinancialsSummary:
    def test_returns_non_empty_string(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 94930000000, "Net Income": 14736000000, "Operating Income": 17517000000}},
                {"date": "2023-09-30", "data": {"Total Revenue": 89498000000, "Net Income": 22956000000, "Operating Income": 22959000000}},
            ]
        }
        ratios = {
            "symbol": "AAPL",
            "pe_ratio": 31.2,
            "profit_margin": 0.241,
            "return_on_equity": 1.6,
            "debt_to_equity": 4.7,
            "dividend_yield": 0.005,
            "beta": 1.24,
        }
        result = build_financials_summary(income_data=income, ratios_data=ratios)
        assert isinstance(result, str)
        assert len(result) > 100
        assert "Revenue" in result

    def test_handles_missing_ratios(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 94930000000}}
            ]
        }
        result = build_financials_summary(income_data=income, ratios_data=None)
        assert isinstance(result, str)
        assert "Revenue" in result

    def test_calculates_revenue_growth(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 100_000_000_000}},
                {"date": "2023-09-30", "data": {"Total Revenue": 90_000_000_000}},
            ]
        }
        result = build_financials_summary(income_data=income, ratios_data=None)
        assert "+11" in result or "11%" in result

    def test_returns_no_data_string_when_no_income(self):
        result = build_financials_summary(income_data=None, ratios_data=None)
        assert "No financial data" in result
