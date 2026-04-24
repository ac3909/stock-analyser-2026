"""API router for market news endpoints.

Provides access to top business headlines from NewsAPI.org.
"""

from typing import Any

from fastapi import APIRouter, Query

from app.services.news import fetch_market_news

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/headlines")
def get_headlines(
    category: str = Query("business", description="News category"),
    page_size: int = Query(10, description="Number of articles (max 20)"),
) -> list[dict[str, Any]]:
    """Fetch top US business headlines.

    Args:
        category: NewsAPI category (business, technology, etc.).
        page_size: Number of articles to return.

    Returns:
        List of article objects.
    """
    return fetch_market_news(category, page_size)
