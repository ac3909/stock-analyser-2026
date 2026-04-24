"""Market news service.

Fetches top business headlines from NewsAPI.org and caches them
to reduce API calls.
"""

import logging
import os
import time
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

NEWSAPI_BASE = "https://newsapi.org/v2"
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")

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


def fetch_market_news(category: str = "business", page_size: int = 10) -> list[dict[str, Any]]:
    """Fetch top US business headlines from NewsAPI.

    Args:
        category: News category (default 'business').
        page_size: Number of articles to return (max 20).

    Returns:
        List of article dicts with title, description, source, url,
        image_url, and published_at.
    """
    safe_size = min(max(page_size, 1), 20)
    cache_key = f"news:{category}:{safe_size}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    if not NEWSAPI_KEY:
        logger.warning("NEWSAPI_KEY not set — returning empty news list")
        return []

    try:
        resp = httpx.get(
            f"{NEWSAPI_BASE}/top-headlines",
            params={
                "country": "us",
                "category": category,
                "pageSize": safe_size,
                "apiKey": NEWSAPI_KEY,
            },
            timeout=10,
        )
        resp.raise_for_status()
        payload = resp.json()

        articles: list[dict[str, Any]] = []
        for item in payload.get("articles", []):
            # Skip removed articles
            if item.get("title") == "[Removed]":
                continue
            articles.append({
                "title": item.get("title", ""),
                "description": item.get("description"),
                "source": item.get("source", {}).get("name", "Unknown"),
                "url": item.get("url", ""),
                "image_url": item.get("urlToImage"),
                "published_at": item.get("publishedAt", ""),
            })

        _set_cached(cache_key, articles)
        return articles
    except Exception:
        logger.exception("Error fetching news from NewsAPI")
        return []
