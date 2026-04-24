"""Smoke tests for the analysis router."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.analysis import Recommendation, AnalysisThesis, Evidence, KeyRisk
from app.models.portfolio import UserGoal


@pytest.fixture
def client():
    return TestClient(app)


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
            bull_case="Services growing at 12% YoY.",
            bear_case="China down 8% YoY.",
            synthesis="Net positive.",
            evidence=[
                Evidence(
                    source="Q4 2024 Earnings Call",
                    quote="Services $24.2B +12% YoY",
                    metric="Services Revenue YoY: +12%",
                    significance="High-margin growth."
                )
            ],
        ),
        key_risks=[
            KeyRisk(
                risk="China revenue declined 8% YoY and represents 17% of total revenue.",
                evidence=[
                    Evidence(
                        source="Q4 2024 Earnings Call",
                        quote="Greater China $15.0B, down 8%",
                        metric="China Revenue YoY: -8%",
                        significance="Third largest geography losing share."
                    )
                ],
                severity="high",
                mitigants="India expansion partially offsetting losses."
            )
        ],
        review_triggers=["Re-evaluate if China declines exceed 15% YoY"],
        sentiment_summary="Short interest low.",
        transcript_quarter=4,
        transcript_year=2024,
        generated_at="2026-04-24T00:00:00Z",
    )


class TestAnalyseTickerEndpoint:
    def test_returns_200_with_recommendation(self, client, sample_goal, sample_recommendation):
        with patch("app.routers.analysis.get_goal", return_value=sample_goal), \
             patch("app.routers.analysis.run_analysis", return_value=sample_recommendation):
            resp = client.post(
                "/api/analysis/AAPL",
                json={"goal_id": "goal-123", "force_refresh": False},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["action"] == "buy"
        assert data["confidence"] == "high"
        assert len(data["thesis"]["evidence"]) >= 1
        assert len(data["key_risks"]) >= 1
        assert len(data["key_risks"][0]["risk"]) > 50

    def test_returns_404_when_goal_not_found(self, client):
        with patch("app.routers.analysis.get_goal", return_value=None):
            resp = client.post(
                "/api/analysis/AAPL",
                json={"goal_id": "nonexistent", "force_refresh": False},
            )
        assert resp.status_code == 404

    def test_returns_422_when_no_transcript(self, client, sample_goal):
        with patch("app.routers.analysis.get_goal", return_value=sample_goal), \
             patch("app.routers.analysis.run_analysis", return_value=None):
            resp = client.post(
                "/api/analysis/FAKE",
                json={"goal_id": "goal-123", "force_refresh": False},
            )
        assert resp.status_code == 422
