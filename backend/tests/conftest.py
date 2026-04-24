"""Shared pytest fixtures for the test suite."""

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_supabase_client(mocker):
    """Mock the httpx client used for Supabase PostgREST calls."""
    mock = MagicMock()
    mock.get = AsyncMock()
    mock.post = AsyncMock()
    mock.patch = AsyncMock()
    mock.delete = AsyncMock()
    return mock


@pytest.fixture
def sample_goal_row():
    return {
        "id": "goal-123",
        "profile": "high_growth",
        "horizon": "long",
        "risk_tolerance": "high",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_transcript_content():
    return (
        "Thank you for joining Apple's Q4 2024 earnings call. "
        "We reported revenue of $94.9 billion, up 6% year-over-year. "
        "Services revenue reached an all-time high of $24.2 billion, up 12% YoY. "
        "We expect Q1 2025 revenue growth in the low-to-mid single digits. "
        "iPhone demand has remained resilient despite macroeconomic headwinds. "
        "We are seeing strong adoption of Apple Intelligence features. "
        "Gross margin came in at 46.2%, ahead of our guidance range. "
        "We returned $29 billion to shareholders through buybacks and dividends."
    )
