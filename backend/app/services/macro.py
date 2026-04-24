"""Macro indicator data service.

Fetches common macroeconomic indicators from Yahoo Finance and provides
a VIX-based Fear & Greed approximation.
"""

import logging
import time
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

INDICATORS = [
    {"symbol": "^VIX", "name": "VIX (Volatility Index)"},
    {"symbol": "^GSPC", "name": "S&P 500"},
    {"symbol": "^DJI", "name": "Dow Jones Industrial Average"},
    {"symbol": "^IXIC", "name": "NASDAQ Composite"},
    {"symbol": "^TNX", "name": "10-Year Treasury Yield"},
    {"symbol": "DX-Y.NYB", "name": "US Dollar Index (DXY)"},
    {"symbol": "GC=F", "name": "Gold Futures"},
    {"symbol": "CL=F", "name": "WTI Crude Oil"},
]

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}

# Simple in-memory cache: key -> (timestamp, data)
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL = 300  # 5 minutes


def _get_cached(key: str) -> Any | None:
    """Return cached value if still valid, else None."""
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _set_cached(key: str, data: Any) -> None:
    """Store a value in the cache."""
    _cache[key] = (time.time(), data)


def get_fear_greed_label(vix_value: float | None) -> str:
    """Map a VIX value to a Fear & Greed sentiment label.

    This is an approximation based on historical VIX ranges,
    not the CNN Fear & Greed Index.

    Args:
        vix_value: Current VIX level.

    Returns:
        Sentiment label string.
    """
    if vix_value is None:
        return "Unknown"
    if vix_value < 12:
        return "Extreme Greed"
    if vix_value < 17:
        return "Greed"
    if vix_value < 22:
        return "Neutral"
    if vix_value < 30:
        return "Fear"
    return "Extreme Fear"


def fetch_indicator(symbol: str, period: str = "6mo") -> dict[str, Any] | None:
    """Fetch historical data for a single macro indicator.

    Args:
        symbol: Yahoo Finance ticker symbol.
        period: Time period (e.g. '6mo', '1y').

    Returns:
        Dict with symbol, name, current_value, change_pct, and prices.
    """
    safe_period = period if period in VALID_PERIODS else "6mo"
    cache_key = f"indicator:{symbol}:{safe_period}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    name = symbol
    for ind in INDICATORS:
        if ind["symbol"] == symbol:
            name = ind["name"]
            break

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=safe_period)
        if hist.empty:
            return None

        prices = []
        for date, row in hist.iterrows():
            prices.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": round(float(row["Close"]), 2),
            })

        current_value = prices[-1]["close"] if prices else None
        change_pct = None
        if len(prices) >= 2:
            prev = prices[-2]["close"]
            if prev != 0:
                change_pct = round(((current_value - prev) / prev) * 100, 2)

        result = {
            "symbol": symbol,
            "name": name,
            "current_value": current_value,
            "change_pct": change_pct,
            "prices": prices,
        }
        _set_cached(cache_key, result)
        return result
    except Exception:
        logger.exception("Error fetching indicator %s", symbol)
        return None


def fetch_all_indicators(period: str = "6mo") -> dict[str, Any]:
    """Fetch all tracked macro indicators and compute Fear & Greed.

    Args:
        period: Time period for price history.

    Returns:
        Dict with indicators list and fear_greed metadata.
    """
    cache_key = f"all_indicators:{period}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    indicators = []
    vix_value = None

    for ind in INDICATORS:
        data = fetch_indicator(ind["symbol"], period)
        if data is not None:
            indicators.append(data)
            if ind["symbol"] == "^VIX":
                vix_value = data["current_value"]

    result = {
        "indicators": indicators,
        "fear_greed_label": get_fear_greed_label(vix_value),
        "fear_greed_vix": vix_value,
    }
    _set_cached(cache_key, result)
    return result
