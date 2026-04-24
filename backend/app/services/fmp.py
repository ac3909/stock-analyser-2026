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


def fetch_stock_info(ticker: str) -> dict[str, Any]:
    """Fetch stock profile, quote, and ratios from FMP, mapped to yfinance .info field names.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with yfinance-compatible field names, or empty dict on error.
    """
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — cannot fetch stock info")
        return {}

    sym = ticker.upper()
    out: dict[str, Any] = {}

    try:
        r = httpx.get(f"{FMP_BASE}/profile/{sym}", params={"apikey": FMP_API_KEY}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data:
            p = data[0]
            out.update({
                "shortName": p.get("companyName"),
                "longName": p.get("companyName"),
                "sector": p.get("sector"),
                "industry": p.get("industry"),
                "country": p.get("country"),
                "website": p.get("website"),
                "longBusinessSummary": p.get("description"),
                "marketCap": p.get("mktCap"),
                "currency": p.get("currency"),
                "exchange": p.get("exchangeShortName"),
                "logo_url": p.get("image"),
                "beta": p.get("beta"),
                "currentPrice": p.get("price"),
                "regularMarketPrice": p.get("price"),
                "fullTimeEmployees": int(p["fullTimeEmployees"]) if p.get("fullTimeEmployees") else None,
                "fiftyTwoWeekHigh": p.get("range", "").split("-")[1].strip() if "-" in str(p.get("range", "")) else None,
                "fiftyTwoWeekLow": p.get("range", "").split("-")[0].strip() if "-" in str(p.get("range", "")) else None,
                "industryKey": p.get("industry", "").lower().replace(" ", "-").replace("—", "-").replace("&", "and"),
            })
    except Exception:
        logger.exception("FMP profile fetch failed for %s", sym)

    try:
        r = httpx.get(f"{FMP_BASE}/quote/{sym}", params={"apikey": FMP_API_KEY}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data:
            q = data[0]
            out.update({
                "currentPrice": q.get("price"),
                "regularMarketPrice": q.get("price"),
                "sharesOutstanding": q.get("sharesOutstanding"),
                "trailingPE": q.get("pe"),
                "fiftyTwoWeekHigh": q.get("yearHigh"),
                "fiftyTwoWeekLow": q.get("yearLow"),
            })
    except Exception:
        logger.exception("FMP quote fetch failed for %s", sym)

    try:
        r = httpx.get(f"{FMP_BASE}/ratios/{sym}", params={"limit": 1, "apikey": FMP_API_KEY}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data:
            rat = data[0]
            out.update({
                "forwardPE": rat.get("priceEarningsRatio"),
                "trailingPegRatio": rat.get("priceEarningsToGrowthRatio"),
                "priceToBook": rat.get("priceToBookRatio"),
                "priceToSalesTrailing12Months": rat.get("priceToSalesRatio"),
                "ev_to_ebitda": rat.get("enterpriseValueMultiple"),
                "profitMargins": rat.get("netProfitMargin"),
                "operatingMargins": rat.get("operatingProfitMargin"),
                "returnOnEquity": rat.get("returnOnEquity"),
                "returnOnAssets": rat.get("returnOnAssets"),
                "debtToEquity": rat.get("debtEquityRatio"),
                "currentRatio": rat.get("currentRatio"),
                "quickRatio": rat.get("quickRatio"),
                "dividendYield": rat.get("dividendYield"),
            })
    except Exception:
        logger.exception("FMP ratios fetch failed for %s", sym)

    return out


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
        if not resp.is_success:
            logger.debug("Short interest unavailable for %s (status %s)", ticker, resp.status_code)
            return None
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "short_float_pct": item.get("shortPercent"),
            "short_shares": item.get("shortShares"),
        }
    except Exception:
        logger.warning("Error fetching short interest for %s", ticker)
        return None
