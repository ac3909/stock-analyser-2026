"""Tests for the portfolio database service."""

import pytest
import httpx
from unittest.mock import MagicMock, patch
from app.services.portfolio_db import (
    create_portfolio,
    get_portfolio,
    list_portfolios,
    add_position,
    get_positions,
    update_position,
    delete_position,
)


@pytest.fixture
def sample_portfolio_row():
    return {
        "id": "port-abc",
        "name": "Tech Growth",
        "goal_id": "goal-123",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_position_row():
    return {
        "id": "pos-xyz",
        "portfolio_id": "port-abc",
        "ticker": "AAPL",
        "shares": 10.0,
        "avg_cost": 185.0,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def _ok_resp(data, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = data
    resp.raise_for_status = MagicMock()
    return resp


class TestCreatePortfolio:
    def test_returns_portfolio_model(self, sample_portfolio_row):
        with patch("app.services.portfolio_db.httpx.post", return_value=_ok_resp([sample_portfolio_row], 201)):
            result = create_portfolio(name="Tech Growth", goal_id="goal-123")
        assert result is not None
        assert result.name == "Tech Growth"
        assert result.goal_id == "goal-123"

    def test_returns_none_on_error(self):
        with patch("app.services.portfolio_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = create_portfolio(name="X")
        assert result is None


class TestGetPositions:
    def test_returns_list_of_positions(self, sample_position_row):
        with patch("app.services.portfolio_db.httpx.get", return_value=_ok_resp([sample_position_row])):
            result = get_positions("port-abc")
        assert len(result) == 1
        assert result[0].ticker == "AAPL"
        assert result[0].shares == 10.0

    def test_returns_empty_list_on_error(self):
        with patch("app.services.portfolio_db.httpx.get", side_effect=httpx.HTTPError("err")):
            result = get_positions("port-abc")
        assert result == []


class TestAddPosition:
    def test_returns_position_model(self, sample_position_row):
        with patch("app.services.portfolio_db.httpx.post", return_value=_ok_resp([sample_position_row], 201)):
            result = add_position(portfolio_id="port-abc", ticker="AAPL", shares=10.0, avg_cost=185.0)
        assert result is not None
        assert result.ticker == "AAPL"

    def test_returns_none_on_error(self):
        with patch("app.services.portfolio_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = add_position("port-abc", "AAPL", 10.0, 185.0)
        assert result is None


class TestUpdatePosition:
    def test_returns_updated_position(self, sample_position_row):
        updated = {**sample_position_row, "shares": 15.0}
        with patch("app.services.portfolio_db.httpx.patch", return_value=_ok_resp([updated])):
            result = update_position("pos-xyz", shares=15.0)
        assert result is not None
        assert result.shares == 15.0

    def test_returns_none_on_error(self):
        with patch("app.services.portfolio_db.httpx.patch", side_effect=httpx.HTTPError("err")):
            result = update_position("pos-xyz", shares=15.0)
        assert result is None


class TestDeletePosition:
    def test_returns_true_on_success(self):
        resp = MagicMock()
        resp.status_code = 204
        resp.raise_for_status = MagicMock()
        with patch("app.services.portfolio_db.httpx.delete", return_value=resp):
            result = delete_position("pos-xyz")
        assert result is True
