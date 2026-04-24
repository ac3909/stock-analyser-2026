"""Portfolio and position CRUD via Supabase PostgREST."""

import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.portfolio import Portfolio, Position

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _headers(prefer: str = "return=representation") -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _url(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


def create_portfolio(name: str, goal_id: str | None = None) -> Portfolio | None:
    """Create a new portfolio record in Supabase and return the created model."""
    try:
        body: dict = {"name": name}
        if goal_id:
            body["goal_id"] = goal_id
        resp = httpx.post(_url("portfolios"), headers=_headers(), json=body, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        return Portfolio(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error creating portfolio")
        return None


def get_portfolio(portfolio_id: str) -> Portfolio | None:
    """Fetch a single portfolio by ID. Returns None if not found."""
    try:
        resp = httpx.get(
            _url("portfolios"),
            headers=_headers(),
            params={"id": f"eq.{portfolio_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return Portfolio(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error fetching portfolio %s", portfolio_id)
        return None


def list_portfolios() -> list[Portfolio]:
    """Return all portfolios from the database."""
    try:
        resp = httpx.get(_url("portfolios"), headers=_headers(), timeout=10)
        resp.raise_for_status()
        return [Portfolio(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error listing portfolios")
        return []


def add_position(portfolio_id: str, ticker: str, shares: float, avg_cost: float) -> Position | None:
    """Add a new position to a portfolio. Ticker is uppercased before storage."""
    try:
        resp = httpx.post(
            _url("positions"),
            headers=_headers(),
            json={
                "portfolio_id": portfolio_id,
                "ticker": ticker.upper(),
                "shares": shares,
                "avg_cost": avg_cost,
            },
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return Position(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error adding position %s to portfolio %s", ticker, portfolio_id)
        return None


def get_positions(portfolio_id: str) -> list[Position]:
    """Return all positions belonging to a given portfolio."""
    try:
        resp = httpx.get(
            _url("positions"),
            headers=_headers(),
            params={"portfolio_id": f"eq.{portfolio_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return [Position(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error fetching positions for portfolio %s", portfolio_id)
        return []


def update_position(
    position_id: str,
    shares: float | None = None,
    avg_cost: float | None = None,
) -> Position | None:
    """Partially update a position's shares and/or avg_cost. Returns the updated model."""
    try:
        body: dict = {}
        if shares is not None:
            body["shares"] = shares
        if avg_cost is not None:
            body["avg_cost"] = avg_cost
        resp = httpx.patch(
            _url("positions"),
            headers=_headers(),
            params={"id": f"eq.{position_id}"},
            json=body,
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return Position(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error updating position %s", position_id)
        return None


def delete_position(position_id: str) -> bool:
    """Delete a position by ID. Returns True on success, False on failure."""
    try:
        resp = httpx.delete(
            _url("positions"),
            headers=_headers(prefer=""),
            params={"id": f"eq.{position_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Error deleting position %s", position_id)
        return False
