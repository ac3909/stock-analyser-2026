"""Tests for the Claude analysis service."""

import pytest
import json
from unittest.mock import MagicMock, patch
from app.services.claude_analysis import extract_transcript, synthesise_recommendation
from app.models.analysis import Recommendation


class TestExtractTranscript:
    def test_returns_structured_extraction_dict(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps({
            "forward_guidance": {
                "revenue": "Low-to-mid single digit growth in Q1 2025",
                "gross_margin": "46.0%-47.0% guidance range",
                "capex": "No material change expected",
                "other": ""
            },
            "management_tone": "confident",
            "tone_evidence": ["We are very pleased with our results", "Demand remains robust"],
            "competitor_mentions": ["Google AI features mentioned as competitive pressure"],
            "risk_flags": ["China revenue softness flagged by analyst questions"]
        }))]
        mock_client.messages.create.return_value = mock_message

        result = extract_transcript(
            transcript_content="Sample earnings call text...",
            ticker="AAPL",
            client=mock_client,
        )

        assert result["management_tone"] == "confident"
        assert "forward_guidance" in result
        assert isinstance(result["risk_flags"], list)

    def test_returns_empty_dict_on_json_parse_error(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="not valid json")]
        mock_client.messages.create.return_value = mock_message

        result = extract_transcript("Some transcript", "AAPL", client=mock_client)
        assert result == {}

    def test_returns_empty_dict_on_api_error(self):
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API error")

        result = extract_transcript("Some transcript", "AAPL", client=mock_client)
        assert result == {}


class TestSynthesiseRecommendation:
    def _make_mock_client(self, action="buy", confidence="high"):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps({
            "action": action,
            "confidence": confidence,
            "goal_alignment": 82,
            "bull_case": "Apple's services segment continues to grow at 12% YoY, providing durable recurring revenue that reduces cyclicality. Management guided for gross margins above 46%, ahead of the 5-year average of 43%. The balance sheet holds $165B in cash, supporting continued buybacks. AI integration into core products represents a long-term monetisation opportunity not fully priced in.",
            "bear_case": "China revenue declined 8% YoY, representing a structural risk given 17% of total revenue exposure. Regulatory pressure on App Store fees in the EU threatens high-margin services growth.",
            "synthesis": "Apple remains a high-quality compounder with durable cash generation. The China headwind is real but manageable given diversification. Services growth offsets hardware cyclicality, supporting a buy thesis for long-horizon growth investors.",
            "evidence": [
                {
                    "source": "Q4 2024 Earnings Call",
                    "quote": "Services revenue reached an all-time high of $24.2 billion, up 12% year-over-year.",
                    "metric": "Services Revenue YoY: +12%",
                    "significance": "Services carry ~70% gross margins vs ~35% for hardware, shifting the revenue mix toward structurally higher profitability."
                }
            ],
            "key_risks": [
                {
                    "risk": "China revenue declined 8% year-over-year and represents 17% of total revenue. Continued softness or further regulatory action by Chinese authorities could materially impact near-term earnings.",
                    "evidence": [
                        {
                            "source": "Q4 2024 Earnings Call",
                            "quote": "Greater China revenue was $15.0 billion, down 8% year-over-year.",
                            "metric": "China Revenue YoY: -8%",
                            "significance": "China is Apple's third-largest geography. An 8% decline signals potential market share loss to local competitors like Huawei."
                        }
                    ],
                    "severity": "high",
                    "mitigants": "Apple Intelligence AI features could drive upgrade cycles in China if regulatory environment stabilises. India expansion is partially offsetting volume losses."
                }
            ],
            "review_triggers": [
                "Re-evaluate if China revenue declines exceed 15% YoY for two consecutive quarters",
                "Reassess if gross margin guidance drops below 44% in any quarter",
                "Revisit if Services revenue growth decelerates below 8% YoY"
            ],
            "sentiment_summary": "Short interest is very low at 0.6% of float. Recent headlines focus on Apple Intelligence reception and Q4 beat."
        }))]
        mock_client.messages.create.return_value = mock_message
        return mock_client

    def test_returns_recommendation_object(self):
        mock_client = self._make_mock_client()
        extraction = {"management_tone": "confident", "forward_guidance": {}, "risk_flags": []}
        financials_summary = "Revenue: $94.9B (+6% YoY). Gross Margin: 46.2%."
        sentiment_summary = "Short interest 0.6%. Recent news positive."
        goal_profile = "high_growth"

        result = synthesise_recommendation(
            ticker="AAPL",
            extraction=extraction,
            financials_summary=financials_summary,
            sentiment_summary=sentiment_summary,
            goal_profile=goal_profile,
            client=mock_client,
        )

        assert isinstance(result, Recommendation)
        assert result.action == "buy"
        assert result.confidence == "high"
        assert result.goal_alignment == 82
        assert len(result.thesis.evidence) >= 1
        assert len(result.key_risks) >= 1
        assert len(result.thesis.bull_case) > 100
        assert len(result.key_risks[0].risk) > 50
        assert len(result.review_triggers) >= 1

    def test_action_valid_enum_value(self):
        mock_client = self._make_mock_client(action="hold")
        result = synthesise_recommendation(
            ticker="AAPL",
            extraction={},
            financials_summary="Revenue flat.",
            sentiment_summary="Neutral.",
            goal_profile="balanced",
            client=mock_client,
        )
        assert result.action in ("strong_buy", "buy", "hold", "trim", "sell")

    def test_returns_none_on_api_error(self):
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API down")
        result = synthesise_recommendation("AAPL", {}, "", "", "high_growth", client=mock_client)
        assert result is None
