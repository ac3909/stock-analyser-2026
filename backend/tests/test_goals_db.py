"""Tests for the user goals database service."""

import pytest
import httpx
from unittest.mock import MagicMock, patch
from app.services.goals_db import create_goal, get_goal, list_goals, delete_goal


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


def _ok_resp(data, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = data if isinstance(data, list) else [data]
    resp.raise_for_status = MagicMock()
    return resp


class TestCreateGoal:
    def test_returns_user_goal_model(self, sample_goal_row):
        with patch("app.services.goals_db.httpx.post", return_value=_ok_resp([sample_goal_row], 201)):
            result = create_goal(profile="high_growth", horizon="long", risk_tolerance="high")
        assert result is not None
        assert result.profile == "high_growth"
        assert result.id == "goal-123"

    def test_returns_none_on_http_error(self):
        with patch("app.services.goals_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = create_goal(profile="high_growth", horizon="long", risk_tolerance="high")
        assert result is None


class TestGetGoal:
    def test_returns_goal_when_found(self, sample_goal_row):
        with patch("app.services.goals_db.httpx.get", return_value=_ok_resp([sample_goal_row])):
            result = get_goal("goal-123")
        assert result is not None
        assert result.id == "goal-123"

    def test_returns_none_when_not_found(self):
        with patch("app.services.goals_db.httpx.get", return_value=_ok_resp([])):
            result = get_goal("nonexistent-id")
        assert result is None


class TestListGoals:
    def test_returns_list(self, sample_goal_row):
        with patch("app.services.goals_db.httpx.get", return_value=_ok_resp([sample_goal_row])):
            result = list_goals()
        assert isinstance(result, list)
        assert len(result) == 1


class TestDeleteGoal:
    def test_returns_true_on_success(self):
        resp = MagicMock()
        resp.status_code = 204
        resp.raise_for_status = MagicMock()
        with patch("app.services.goals_db.httpx.delete", return_value=resp):
            result = delete_goal("goal-123")
        assert result is True

    def test_returns_false_on_error(self):
        with patch("app.services.goals_db.httpx.delete", side_effect=httpx.HTTPError("err")):
            result = delete_goal("goal-123")
        assert result is False
