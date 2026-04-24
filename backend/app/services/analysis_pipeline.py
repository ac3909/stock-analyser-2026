"""Analysis pipeline orchestrator.

run_analysis() is the single entry point. It:
  1. Loads transcript from Supabase cache or FMP
  2. Fetches financial data via existing yfinance service
  3. Fetches sentiment signals
  4. Calls Claude for extraction + synthesis
  5. Persists the result to stock_analyses table
  6. Returns a Recommendation model
"""

import json
import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.analysis import Recommendation
from app.models.portfolio import UserGoal
from app.services.claude_analysis import extract_transcript, synthesise_recommendation
from app.services.financials_summary import build_financials_summary
from app.services.fmp import fetch_latest_transcript
from app.services.sentiment import fetch_sentiment_signals, summarise_sentiment
from app.services.yahoo_finance import YahooFinanceProvider

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _load_cached_transcript(ticker: str) -> dict | None:
    """Load the most recent cached transcript for a ticker from Supabase."""
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/earnings_transcripts",
            headers=_supabase_headers(),
            params={
                "ticker": f"eq.{ticker.upper()}",
                "order": "year.desc,quarter.desc",
                "limit": "1",
            },
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None
        row = rows[0]
        return {"content": row["content"], "quarter": row["quarter"], "year": row["year"]}
    except Exception:
        logger.warning("Could not load cached transcript for %s", ticker)
        return None


def _save_transcript_to_cache(ticker: str, quarter: int, year: int, content: str) -> None:
    """Upsert a transcript into Supabase earnings_transcripts cache."""
    try:
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/earnings_transcripts",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"ticker": ticker.upper(), "quarter": quarter, "year": year, "content": content},
            timeout=10,
        )
    except Exception:
        logger.warning("Could not cache transcript for %s Q%s %s", ticker, quarter, year)


def _persist_analysis(ticker: str, goal: UserGoal, rec: Recommendation) -> None:
    """Persist a completed recommendation to stock_analyses table."""
    try:
        body = {
            "ticker": ticker.upper(),
            "goal_profile": goal.profile,
            "transcript_quarter": rec.transcript_quarter,
            "transcript_year": rec.transcript_year,
            "action": rec.action,
            "confidence": rec.confidence,
            "goal_alignment": rec.goal_alignment,
            "bull_case": rec.thesis.bull_case,
            "bear_case": rec.thesis.bear_case,
            "synthesis": rec.thesis.synthesis,
            "evidence": json.dumps([e.model_dump() for e in rec.thesis.evidence]),
            "key_risks": json.dumps([r.model_dump() for r in rec.key_risks]),
            "review_triggers": json.dumps(rec.review_triggers),
            "sentiment_summary": rec.sentiment_summary,
        }
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/stock_analyses",
            headers=_supabase_headers(),
            json=body,
            timeout=10,
        )
    except Exception:
        logger.warning("Could not persist analysis for %s", ticker)


def run_analysis(ticker: str, goal: UserGoal, force_refresh: bool = False) -> Recommendation | None:
    """Run the full analysis pipeline for a ticker against a user goal.

    Args:
        ticker: Stock ticker symbol.
        goal: The user's investment goal profile.
        force_refresh: If True, bypass transcript cache and re-fetch from FMP.

    Returns:
        Recommendation model on success. None if transcript unavailable.
    """
    ticker = ticker.upper()

    # 1. Transcript — cache first, then FMP
    transcript = None
    if not force_refresh:
        transcript = _load_cached_transcript(ticker)

    if transcript is None:
        transcript = fetch_latest_transcript(ticker)
        if transcript is None:
            logger.warning("No transcript available for %s — cannot run analysis", ticker)
            return None
        if transcript.get("quarter") and transcript.get("year"):
            _save_transcript_to_cache(
                ticker,
                transcript["quarter"],
                transcript["year"],
                transcript["content"],
            )

    # 2. Financials
    provider = YahooFinanceProvider()
    income = provider.get_income_statement(ticker)
    ratios = provider.get_key_ratios(ticker)
    financials_summary = build_financials_summary(
        income_data=income.model_dump() if income else None,
        ratios_data=ratios,
    )

    # 3. Sentiment
    signals = fetch_sentiment_signals(ticker)
    sentiment_text = summarise_sentiment(signals)

    # 4. Claude extraction
    extraction = extract_transcript(
        transcript_content=transcript["content"],
        ticker=ticker,
    )

    # 5. Claude synthesis
    rec = synthesise_recommendation(
        ticker=ticker,
        extraction=extraction,
        financials_summary=financials_summary,
        sentiment_summary=sentiment_text,
        goal_profile=goal.profile,
    )
    if rec is None:
        return None

    rec.transcript_quarter = transcript.get("quarter")
    rec.transcript_year = transcript.get("year")

    # 6. Persist
    _persist_analysis(ticker, goal, rec)

    return rec
