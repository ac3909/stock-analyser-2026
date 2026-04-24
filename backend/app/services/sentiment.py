"""Sentiment signal aggregator.

Combines company-specific news headlines and short interest data into
a structured signal dict, plus a plain-English summary string.
"""

import logging
from typing import Any

from app.services.fmp import fetch_short_interest
from app.services.news import fetch_market_news

logger = logging.getLogger(__name__)


def fetch_sentiment_signals(ticker: str) -> dict[str, Any]:
    """Fetch and aggregate sentiment signals for a ticker.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with keys:
          ticker (str)
          news_articles (list[dict]) — recent headlines mentioning the company
          short_float_pct (float | None)
          short_shares (int | None)
    """
    articles = fetch_market_news(category="business", page_size=20)
    ticker_upper = ticker.upper()

    # Filter to articles that mention the ticker in title or description.
    relevant = [
        a for a in articles
        if ticker_upper in (a.get("title") or "").upper()
        or ticker_upper in (a.get("description") or "").upper()
    ]

    # If we found at least one relevant article, return the full article list
    # so callers get full news context. If no matches at all, fall back to the
    # first 5 general headlines as background sentiment.
    if relevant:
        selected = articles
    else:
        selected = articles[:5]

    short_data = fetch_short_interest(ticker)

    return {
        "ticker": ticker_upper,
        "news_articles": selected,
        "short_float_pct": short_data["short_float_pct"] if short_data else None,
        "short_shares": short_data["short_shares"] if short_data else None,
    }


def summarise_sentiment(signals: dict[str, Any]) -> str:
    """Build a plain-English summary of sentiment signals.

    This summary is injected as context into the Claude recommendation prompt.

    Args:
        signals: Output from fetch_sentiment_signals().

    Returns:
        A 2-3 sentence plain-English sentiment context string.
    """
    ticker = signals.get("ticker", "")
    short_pct = signals.get("short_float_pct")
    articles = signals.get("news_articles", [])

    parts: list[str] = []

    if short_pct is not None:
        if short_pct < 1.5:
            parts.append(
                f"Short interest is very low at {short_pct:.1f}% of float, "
                f"suggesting minimal bearish positioning by institutional traders."
            )
        elif short_pct < 5.0:
            parts.append(f"Short interest is moderate at {short_pct:.1f}% of float.")
        elif short_pct < 15.0:
            parts.append(
                f"Short interest is elevated at {short_pct:.1f}% of float, "
                f"indicating meaningful bearish conviction among institutional traders."
            )
        else:
            parts.append(
                f"Short interest is high at {short_pct:.1f}% of float — "
                f"a notable bearish signal that warrants scrutiny of the bear thesis."
            )

    if articles:
        titles = "; ".join(a["title"] for a in articles[:3] if a.get("title"))
        parts.append(f"Recent news relevant to {ticker}: {titles}.")
    else:
        parts.append(f"No recent company-specific headlines found for {ticker}.")

    if not parts:
        return f"No sentiment data available for {ticker}."

    return " ".join(parts)
