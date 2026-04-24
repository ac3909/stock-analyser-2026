"""Tests for the analysis pipeline orchestrator."""

import pytest
from unittest.mock import MagicMock, patch
from app.models.portfolio import UserGoal
from app.models.analysis import Recommendation, AnalysisThesis, Evidence, KeyRisk
from app.services.analysis_pipeline import run_analysis


@pytest.fixture
def sample_goal():
    return UserGoal(
        id="goal-123",
        profile="high_growth",
        horizon="long",
        risk_tolerance="high",
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def sample_recommendation():
    return Recommendation(
        ticker="AAPL",
        goal_profile="high_growth",
        action="buy",
        confidence="high",
        goal_alignment=82,
        thesis=AnalysisThesis(
            bull_case="Services growing at 12% YoY with 70% gross margins.",
            bear_case="China revenue down 8% YoY.",
            synthesis="Net positive thesis — buy.",
            evidence=[
                Evidence(
                    source="Q4 2024 Earnings Call",
                    quote="Services revenue $24.2B, up 12% YoY",
                    metric="Services Revenue YoY: +12%",
                    significance="High-margin growth offsets hardware cyclicality."
                )
            ],
        ),
        key_risks=[
            KeyRisk(
                risk="China revenue declined 8% YoY.",
                evidence=[
                    Evidence(
                        source="Q4 2024 Earnings Call",
                        quote="Greater China $15.0B, down 8% YoY",
                        metric="China Revenue YoY: -8%",
                        significance="Third largest geography showing structural softness."
                    )
                ],
                severity="high",
                mitigants="India expansion partially offsetting."
            )
        ],
        review_triggers=["Re-evaluate if China revenue declines exceed 15% YoY"],
        sentiment_summary="Short interest low at 0.6%.",
        transcript_quarter=4,
        transcript_year=2024,
        generated_at="2026-04-24T00:00:00Z",
    )


class TestRunAnalysis:
    def test_returns_recommendation_for_valid_input(self, sample_goal, sample_recommendation):
        mock_yf = MagicMock()
        mock_yf.get_income_statement.return_value = None
        mock_yf.get_key_ratios.return_value = None

        with patch("app.services.analysis_pipeline.fetch_latest_transcript") as mock_transcript, \
             patch("app.services.analysis_pipeline._load_cached_transcript", return_value=None), \
             patch("app.services.analysis_pipeline.fetch_sentiment_signals") as mock_sentiment, \
             patch("app.services.analysis_pipeline.summarise_sentiment", return_value="Short interest low."), \
             patch("app.services.analysis_pipeline.YahooFinanceProvider", return_value=mock_yf), \
             patch("app.services.analysis_pipeline.build_financials_summary", return_value="Revenue: $94.9B"), \
             patch("app.services.analysis_pipeline.extract_transcript", return_value={"management_tone": "confident"}), \
             patch("app.services.analysis_pipeline.synthesise_recommendation", return_value=sample_recommendation), \
             patch("app.services.analysis_pipeline._persist_analysis", return_value=None), \
             patch("app.services.analysis_pipeline._save_transcript_to_cache", return_value=None):

            mock_transcript.return_value = {
                "content": "Earnings call text...", "quarter": 4, "year": 2024
            }
            mock_sentiment.return_value = {"ticker": "AAPL", "news_articles": [], "short_float_pct": 0.6}

            result = run_analysis(ticker="AAPL", goal=sample_goal)

        assert result is not None
        assert isinstance(result, Recommendation)
        assert result.action == "buy"

    def test_returns_none_when_transcript_missing(self, sample_goal):
        with patch("app.services.analysis_pipeline._load_cached_transcript", return_value=None), \
             patch("app.services.analysis_pipeline.fetch_latest_transcript", return_value=None):
            result = run_analysis(ticker="FAKE", goal=sample_goal)
        assert result is None

    def test_uses_cached_transcript_skips_fmp(self, sample_goal, sample_recommendation):
        mock_yf = MagicMock()
        mock_yf.get_income_statement.return_value = None
        mock_yf.get_key_ratios.return_value = None

        with patch("app.services.analysis_pipeline._load_cached_transcript") as mock_cache, \
             patch("app.services.analysis_pipeline.fetch_latest_transcript") as mock_fmp, \
             patch("app.services.analysis_pipeline.fetch_sentiment_signals") as mock_sentiment, \
             patch("app.services.analysis_pipeline.summarise_sentiment", return_value="Neutral."), \
             patch("app.services.analysis_pipeline.YahooFinanceProvider", return_value=mock_yf), \
             patch("app.services.analysis_pipeline.build_financials_summary", return_value="Revenue: $94.9B"), \
             patch("app.services.analysis_pipeline.extract_transcript", return_value={}), \
             patch("app.services.analysis_pipeline.synthesise_recommendation", return_value=sample_recommendation), \
             patch("app.services.analysis_pipeline._persist_analysis", return_value=None):

            mock_cache.return_value = {
                "content": "Cached transcript...", "quarter": 4, "year": 2024
            }
            mock_sentiment.return_value = {"ticker": "AAPL", "news_articles": [], "short_float_pct": None}

            result = run_analysis(ticker="AAPL", goal=sample_goal)

        assert result is not None
        mock_fmp.assert_not_called()  # FMP not called when cache hits
