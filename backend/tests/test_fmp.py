"""Tests for the FMP transcript service."""

import pytest
import httpx
from unittest.mock import patch, MagicMock
from app.services.fmp import fetch_transcript, fetch_latest_transcript, fetch_short_interest


class TestFetchTranscript:
    def test_returns_content_for_valid_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "quarter": 4, "year": 2024, "content": "Revenue was strong."}
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", return_value=mock_response):
                result = fetch_transcript("AAPL", quarter=4, year=2024)

        assert result is not None
        assert result["content"] == "Revenue was strong."
        assert result["quarter"] == 4
        assert result["year"] == 2024

    def test_returns_none_for_empty_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", return_value=mock_response):
                result = fetch_transcript("FAKE", quarter=1, year=2020)

        assert result is None

    def test_returns_none_on_http_error(self):
        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", side_effect=httpx.HTTPError("timeout")):
                result = fetch_transcript("AAPL", quarter=4, year=2024)

        assert result is None

    def test_latest_uses_most_recent_quarter(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "quarter": 4, "year": 2024, "content": "Q4 call."},
            {"symbol": "AAPL", "quarter": 3, "year": 2024, "content": "Q3 call."},
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", return_value=mock_response):
                result = fetch_latest_transcript("AAPL")

        assert result is not None
        assert result["quarter"] == 4


class TestFetchShortInterest:
    def test_returns_short_float_for_valid_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "shortPercent": 0.57, "shortShares": 89000000}
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", return_value=mock_response):
                result = fetch_short_interest("AAPL")

        assert result is not None
        assert result["short_float_pct"] == pytest.approx(0.57)

    def test_returns_none_on_error(self):
        with patch("app.services.fmp.FMP_API_KEY", "test-key"):
            with patch("app.services.fmp.httpx.get", side_effect=httpx.HTTPError("error")):
                result = fetch_short_interest("AAPL")

        assert result is None
