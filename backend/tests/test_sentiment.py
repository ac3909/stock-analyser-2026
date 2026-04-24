"""Tests for the sentiment aggregation service."""

import pytest
from unittest.mock import patch
from app.services.sentiment import fetch_sentiment_signals, summarise_sentiment


class TestFetchSentimentSignals:
    def test_returns_combined_signals(self):
        mock_articles = [
            {"title": "Apple beats earnings estimates", "url": "https://example.com/1", "description": "AAPL beat Q4"},
            {"title": "iPhone sales surge in China", "url": "https://example.com/2", "description": None},
        ]
        mock_short = {"short_float_pct": 0.57, "short_shares": 89_000_000}

        with patch("app.services.sentiment.fetch_market_news", return_value=mock_articles):
            with patch("app.services.sentiment.fetch_short_interest", return_value=mock_short):
                result = fetch_sentiment_signals("AAPL")

        assert result["news_articles"] == mock_articles
        assert result["short_float_pct"] == pytest.approx(0.57)
        assert result["ticker"] == "AAPL"

    def test_handles_missing_short_interest(self):
        mock_articles = [{"title": "Apple news", "url": "https://example.com", "description": None}]

        with patch("app.services.sentiment.fetch_market_news", return_value=mock_articles):
            with patch("app.services.sentiment.fetch_short_interest", return_value=None):
                result = fetch_sentiment_signals("AAPL")

        assert result["short_float_pct"] is None
        assert result["news_articles"] == mock_articles

    def test_handles_no_news(self):
        with patch("app.services.sentiment.fetch_market_news", return_value=[]):
            with patch("app.services.sentiment.fetch_short_interest", return_value=None):
                result = fetch_sentiment_signals("AAPL")

        assert result["news_articles"] == []


class TestSummariseSentiment:
    def test_returns_string_with_short_interest_context(self):
        signals = {
            "ticker": "AAPL",
            "short_float_pct": 5.2,
            "short_shares": 80_000_000,
            "news_articles": [
                {"title": "Apple beats Q4 estimates"},
                {"title": "iPhone demand strong"},
            ],
        }
        result = summarise_sentiment(signals)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_low_short_interest_reflected_in_summary(self):
        signals = {
            "ticker": "AAPL",
            "short_float_pct": 0.5,
            "short_shares": 10_000_000,
            "news_articles": [],
        }
        result = summarise_sentiment(signals)
        assert "short" in result.lower() or "low" in result.lower()

    def test_returns_string_when_empty(self):
        signals = {"ticker": "FAKE", "short_float_pct": None, "news_articles": []}
        result = summarise_sentiment(signals)
        assert isinstance(result, str)
