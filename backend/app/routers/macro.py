"""API router for macroeconomic indicator endpoints.

Provides access to common market indices, commodities, and a
VIX-based Fear & Greed sentiment indicator.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services.macro import (
    fetch_all_indicators,
    fetch_all_indicators_with_summaries,
    fetch_indicator,
)
from app.services.news import fetch_market_news

router = APIRouter(prefix="/api/macro", tags=["macro"])


@router.get("/indicators")
def get_all_indicators(
    period: str = Query("6mo", description="Time period for price history"),
) -> dict[str, Any]:
    """Fetch all tracked macro indicators with Fear & Greed gauge.

    Args:
        period: yfinance period string (1mo, 3mo, 6mo, 1y, 2y, 5y).

    Returns:
        Dict with indicators list and fear/greed metadata.
    """
    return fetch_all_indicators(period)


@router.get("/summaries")
def get_all_with_summaries(
    period: str = Query("6mo", description="Time period for price history"),
) -> dict[str, Any]:
    """Fetch all indicators with AI-generated news summaries.

    Fetches current headlines and uses Claude to generate a 1-2 sentence
    summary for each indicator explaining recent price movements.

    Args:
        period: yfinance period string (1mo, 3mo, 6mo, 1y, 2y, 5y).

    Returns:
        Dict with indicators (including summary field) and fear/greed metadata.
    """
    news = fetch_market_news()
    articles = [
        {"title": a["title"], "url": a["url"]}
        for a in news
        if a.get("title") and a.get("url")
    ]
    return fetch_all_indicators_with_summaries(period, articles)


@router.get("/indicator/{symbol}")
def get_indicator(
    symbol: str,
    period: str = Query("1y", description="Time period for price history"),
) -> dict[str, Any]:
    """Fetch historical data for a single macro indicator.

    Args:
        symbol: Yahoo Finance ticker symbol (e.g. ^VIX, ^GSPC).
        period: yfinance period string.

    Returns:
        Indicator data with prices.

    Raises:
        HTTPException: 404 if the indicator cannot be fetched.
    """
    data = fetch_indicator(symbol, period)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Indicator '{symbol}' not found")
    return data
