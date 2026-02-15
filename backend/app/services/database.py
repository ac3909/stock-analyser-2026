"""Supabase database service for persisting projections.

Communicates with Supabase's PostgREST API via httpx. Expects a
'projections' table with columns: id, ticker, title, data, created_at, updated_at.
"""

import logging
import os
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_TABLE = "projections"


def _headers() -> dict[str, str]:
    """Build the standard headers for Supabase PostgREST requests."""
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _url(path: str = "") -> str:
    """Build the full URL for a PostgREST endpoint."""
    return f"{SUPABASE_URL}/rest/v1/{_TABLE}{path}"


def is_configured() -> bool:
    """Check whether Supabase credentials are present."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


async def save_projection(
    ticker: str,
    title: str,
    data: dict[str, Any],
) -> dict[str, Any] | None:
    """Insert a new projection into the database.

    Args:
        ticker: The stock ticker symbol (e.g. 'AAPL').
        title: A user-defined name for this projection.
        data: The projection payload (assumptions, results, etc.).

    Returns:
        The inserted row as a dict, or None on failure.
    """
    payload = {
        "ticker": ticker.upper(),
        "title": title,
        "data": data,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(_url(), headers=_headers(), json=payload)
            resp.raise_for_status()
            rows = resp.json()
            return rows[0] if rows else None
    except Exception:
        logger.exception("Failed to save projection for '%s'", ticker)
        return None


async def get_projections(ticker: str | None = None) -> list[dict[str, Any]]:
    """Fetch projections, optionally filtered by ticker.

    Args:
        ticker: If provided, only return projections for this ticker.

    Returns:
        A list of projection rows. Empty list on failure.
    """
    params: dict[str, str] = {"order": "created_at.desc"}
    if ticker:
        params["ticker"] = f"eq.{ticker.upper()}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(_url(), headers=_headers(), params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.exception("Failed to fetch projections")
        return []


async def update_projection(
    projection_id: str,
    updates: dict[str, Any],
) -> dict[str, Any] | None:
    """Update an existing projection by ID.

    Args:
        projection_id: The UUID of the projection to update.
        updates: A dict of fields to update (e.g. title, data).

    Returns:
        The updated row as a dict, or None on failure.
    """
    updates["updated_at"] = datetime.utcnow().isoformat()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                _url(f"?id=eq.{projection_id}"),
                headers=_headers(),
                json=updates,
            )
            resp.raise_for_status()
            rows = resp.json()
            return rows[0] if rows else None
    except Exception:
        logger.exception("Failed to update projection '%s'", projection_id)
        return None


async def delete_projection(projection_id: str) -> bool:
    """Delete a projection by ID.

    Args:
        projection_id: The UUID of the projection to delete.

    Returns:
        True if the deletion succeeded, False otherwise.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                _url(f"?id=eq.{projection_id}"),
                headers=_headers(),
            )
            resp.raise_for_status()
            return True
    except Exception:
        logger.exception("Failed to delete projection '%s'", projection_id)
        return False
