"""User goals CRUD via Supabase PostgREST."""

import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.portfolio import UserGoal

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
TABLE = "user_goals"


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _base_url() -> str:
    return f"{SUPABASE_URL}/rest/v1/{TABLE}"


def create_goal(profile: str, horizon: str, risk_tolerance: str) -> UserGoal | None:
    """Create a new user goal record in Supabase and return the created model."""
    try:
        resp = httpx.post(
            _base_url(),
            headers=_headers(),
            json={"profile": profile, "horizon": horizon, "risk_tolerance": risk_tolerance},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return UserGoal(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error creating user goal")
        return None


def get_goal(goal_id: str) -> UserGoal | None:
    """Fetch a single user goal by ID. Returns None if not found."""
    try:
        resp = httpx.get(
            _base_url(),
            headers=_headers(),
            params={"id": f"eq.{goal_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return UserGoal(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error fetching goal %s", goal_id)
        return None


def list_goals() -> list[UserGoal]:
    """Return all user goals from the database."""
    try:
        resp = httpx.get(_base_url(), headers=_headers(), timeout=10)
        resp.raise_for_status()
        return [UserGoal(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error listing goals")
        return []


def delete_goal(goal_id: str) -> bool:
    """Delete a user goal by ID. Returns True on success, False on failure."""
    try:
        resp = httpx.delete(
            _base_url(),
            headers={**_headers(), "Prefer": ""},
            params={"id": f"eq.{goal_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Error deleting goal %s", goal_id)
        return False
