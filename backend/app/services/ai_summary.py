"""AI-powered market summary service.

Generates short explanations of indicator price movements using Groq,
with smart caching that only regenerates when news headlines change.
Returns structured summaries with source article links.
"""

import hashlib
import json
import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Cache: indicator_name -> (headlines_hash, summary_dict)
_summary_cache: dict[str, tuple[str, dict[str, Any]]] = {}


def _hash_headlines(headlines: list[str]) -> str:
    """Create a stable hash of headline titles to detect changes."""
    combined = "|".join(sorted(headlines))
    return hashlib.md5(combined.encode()).hexdigest()


def generate_indicator_summary(
    indicator_name: str,
    prices_2w: list[dict[str, Any]],
    articles: list[dict[str, str]],
) -> dict[str, Any]:
    """Generate a structured summary explaining recent price movements.

    Uses Groq's free tier for fast inference. Results are cached
    by indicator name and only regenerated when news headlines change.

    Args:
        indicator_name: Human-readable indicator name (e.g. "S&P 500").
        prices_2w: Last ~2 weeks of price data [{date, close}, ...].
        articles: Recent news articles [{title, url}, ...].

    Returns:
        Dict with 'text' (summary string) and 'sources' (list of
        {title, url} dicts), or empty dict on error.
    """
    if not GROQ_API_KEY:
        return {}

    if not prices_2w or not articles:
        return {}

    headlines = [a["title"] for a in articles if a.get("title")]
    current_hash = _hash_headlines(headlines)

    # Check cache — skip LLM call if headlines haven't changed
    cached = _summary_cache.get(indicator_name)
    if cached is not None:
        cached_hash, cached_summary = cached
        if cached_hash == current_hash:
            return cached_summary

    # Build price context
    if len(prices_2w) >= 2:
        start_price = prices_2w[0]["close"]
        end_price = prices_2w[-1]["close"]
        change = end_price - start_price
        change_pct = (change / start_price) * 100 if start_price != 0 else 0
        price_context = (
            f"{indicator_name}: moved from {start_price:.2f} to {end_price:.2f} "
            f"({change_pct:+.1f}%) over the past 2 weeks."
        )
    else:
        price_context = f"{indicator_name}: limited price data available."

    # Build numbered headline list so the LLM can reference them
    headlines_numbered = "\n".join(
        f"{i + 1}. {a['title']}" for i, a in enumerate(articles[:10])
    )

    prompt = (
        f"You are writing a brief note for a chart card that already shows the indicator name "
        f"and price data. Do NOT repeat the indicator name or price figures — the user can see those.\n\n"
        f"Reference specific real events from the headlines below. Be concrete — name companies, "
        f"policies, or data releases. No generic language like 'market uncertainty' or 'economic factors'.\n\n"
        f"Respond in JSON with exactly this structure:\n"
        f'{{"text": "Your 1-sentence summary referencing specific events.", '
        f'"source_indices": [1, 3]}}\n\n'
        f"source_indices should list the 2-3 most relevant headline numbers from below.\n\n"
        f"Context (for your reference only, do not echo back):\n{price_context}\n\n"
        f"Headlines:\n{headlines_numbered}"
    )

    try:
        resp = httpx.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 150,
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
            timeout=15,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()

        # Parse the JSON response
        parsed = json.loads(raw)
        text = parsed.get("text", "").strip()
        source_indices = parsed.get("source_indices", [])

        # Map indices back to article title+url pairs
        sources = []
        for idx in source_indices:
            i = idx - 1  # Convert 1-based to 0-based
            if 0 <= i < len(articles):
                sources.append({
                    "title": articles[i]["title"],
                    "url": articles[i]["url"],
                })

        result: dict[str, Any] = {"text": text, "sources": sources}
        _summary_cache[indicator_name] = (current_hash, result)
        return result
    except json.JSONDecodeError:
        # If JSON parsing fails, use the raw text as a fallback
        try:
            raw_text = resp.json()["choices"][0]["message"]["content"].strip()
            result = {"text": raw_text, "sources": []}
            _summary_cache[indicator_name] = (current_hash, result)
            return result
        except Exception:
            return {}
    except Exception:
        logger.exception("Error generating summary for %s", indicator_name)
        return {}
