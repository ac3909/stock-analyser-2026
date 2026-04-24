"""Financial Modeling Prep API client.

Fetches earnings call transcripts and short interest data.
Results are not cached here — callers handle persistence.
"""

import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

FMP_API_KEY = os.getenv("FMP_API_KEY", "")
FMP_BASE = "https://financialmodelingprep.com/api/v3"


def fetch_transcript(ticker: str, quarter: int, year: int) -> dict[str, Any] | None:
    """Fetch a single earnings call transcript by ticker, quarter, and year.

    Args:
        ticker: Stock ticker symbol.
        quarter: Fiscal quarter (1-4).
        year: Fiscal year (e.g. 2024).

    Returns:
        Dict with keys: symbol, quarter, year, content. None on error or not found.
    """
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — cannot fetch transcript")
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/earning_call_transcript/{ticker.upper()}",
            params={"quarter": quarter, "year": year, "apikey": FMP_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "symbol": item.get("symbol", ticker.upper()),
            "quarter": item.get("quarter", quarter),
            "year": item.get("year", year),
            "content": item.get("content", ""),
        }
    except Exception:
        logger.exception("Error fetching transcript for %s Q%d %d", ticker, quarter, year)
        return None


def fetch_latest_transcript(ticker: str) -> dict[str, Any] | None:
    """Fetch the most recent available earnings call transcript for a ticker.

    Calls the list endpoint (no quarter/year filter) and returns the first result,
    which FMP returns in reverse-chronological order.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with keys: symbol, quarter, year, content. None on error or not found.
    """
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — cannot fetch transcript")
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/earning_call_transcript/{ticker.upper()}",
            params={"apikey": FMP_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "symbol": item.get("symbol", ticker.upper()),
            "quarter": item.get("quarter"),
            "year": item.get("year"),
            "content": item.get("content", ""),
        }
    except Exception:
        logger.exception("Error fetching latest transcript for %s", ticker)
        return None


def fetch_short_interest(ticker: str) -> dict[str, Any] | None:
    """Fetch the latest short interest data for a ticker.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with short_float_pct and short_shares. None on error or not available.
    """
    if not FMP_API_KEY:
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/short-volume/{ticker.upper()}",
            params={"apikey": FMP_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "short_float_pct": item.get("shortPercent"),
            "short_shares": item.get("shortShares"),
        }
    except Exception:
        logger.exception("Error fetching short interest for %s", ticker)
        return None
