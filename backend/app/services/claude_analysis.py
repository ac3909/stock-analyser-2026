"""Claude-powered investment analysis.

Two-step pipeline:
  1. extract_transcript()  — structured JSON extraction from raw call text.
  2. synthesise_recommendation() — full Recommendation from extraction + context.

The caller passes in the Anthropic client so tests can inject a mock.
In production, get_client() is called by the pipeline orchestrator.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import anthropic
from dotenv import load_dotenv

from app.models.analysis import (
    AnalysisThesis,
    Evidence,
    KeyRisk,
    Recommendation,
)

load_dotenv()

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"

_GOAL_CONTEXT: dict[str, str] = {
    "high_growth": (
        "The investor prioritises maximum capital appreciation over 10+ years and can tolerate high volatility. "
        "Weight revenue growth rate, market share expansion, forward guidance strength, and TAM expansion heavily. "
        "Downweight dividend yield and near-term earnings stability."
    ),
    "balanced": (
        "The investor wants steady growth with some income over a 5-10 year horizon. "
        "Weight earnings quality, sustainable margins, ROE, and moderate dividend as equally important. "
        "Flag high leverage or cyclical revenue as negatives."
    ),
    "income": (
        "The investor's primary goal is reliable and growing dividend income. "
        "Weight free cash flow coverage of dividends, dividend growth streak, and payout ratio sustainability above all. "
        "Flag any risk to the dividend immediately. Earnings growth is secondary."
    ),
    "defensive": (
        "The investor prioritises capital preservation with low volatility. "
        "Weight balance sheet strength, low beta, high current ratio, and defensive sector positioning. "
        "Flag high leverage, cyclicality, or dependency on a single geography as high-severity risks."
    ),
}


def get_client() -> anthropic.Anthropic:
    """Return a production Anthropic client."""
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def extract_transcript(
    transcript_content: str,
    ticker: str,
    client: anthropic.Anthropic | None = None,
) -> dict[str, Any]:
    """Extract structured information from a raw earnings call transcript.

    Uses prompt caching on the transcript content so subsequent calls
    for the same transcript are ~10x cheaper.

    Args:
        transcript_content: Raw text of the earnings call transcript.
        ticker: Ticker symbol for context.
        client: Anthropic client (inject for testing; defaults to get_client()).

    Returns:
        Dict with keys: forward_guidance, management_tone, tone_evidence,
        competitor_mentions, risk_flags. Empty dict on error.
    """
    if client is None:
        client = get_client()

    extraction_schema = {
        "forward_guidance": {
            "revenue": "Management's revenue guidance for next quarter/year",
            "gross_margin": "Gross margin guidance if given",
            "capex": "Capital expenditure guidance if given",
            "other": "Any other quantitative guidance given"
        },
        "management_tone": "One of: confident / cautious / defensive / evasive",
        "tone_evidence": ["List of 2-4 direct quotes that justify the tone classification"],
        "competitor_mentions": ["List of competitor references or competitive risk statements"],
        "risk_flags": ["List of concerning statements, analyst pushback themes, or disclosed risks"]
    }

    prompt = (
        f"You are analysing the earnings call transcript for {ticker}. "
        f"Extract the following information and return ONLY valid JSON matching this schema exactly:\n"
        f"{json.dumps(extraction_schema, indent=2)}\n\n"
        f"Be precise. Use direct quotes from the transcript for tone_evidence and risk_flags. "
        f"If a field has no relevant content, use an empty string or empty list."
    )

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": f"You are a professional equity analyst. Earnings call transcript for {ticker}:\n\n{transcript_content}",
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Claude extraction returned non-JSON for %s", ticker)
        return {}
    except Exception:
        logger.exception("Claude extraction failed for %s", ticker)
        return {}


def synthesise_recommendation(
    ticker: str,
    extraction: dict[str, Any],
    financials_summary: str,
    sentiment_summary: str,
    goal_profile: str,
    client: anthropic.Anthropic | None = None,
) -> Recommendation | None:
    """Generate a full investment recommendation from extracted signals.

    Args:
        ticker: Stock ticker symbol.
        extraction: Output from extract_transcript().
        financials_summary: Pre-formatted string of key financial metrics.
        sentiment_summary: Output from sentiment.summarise_sentiment().
        goal_profile: One of 'high_growth', 'balanced', 'income', 'defensive'.
        client: Anthropic client (inject for testing).

    Returns:
        Recommendation model instance. None on error.
    """
    if client is None:
        client = get_client()

    goal_context = _GOAL_CONTEXT.get(goal_profile, _GOAL_CONTEXT["balanced"])

    recommendation_schema = {
        "action": "One of: strong_buy / buy / hold / trim / sell",
        "confidence": "One of: high / medium / low",
        "goal_alignment": "Integer 0-100: how well this stock fits the investor goal profile",
        "bull_case": "4-6 sentences. Cite specific metrics, guidance, and trends. Reference evidence sources.",
        "bear_case": "3-4 sentences. Cite specific risks and their potential financial impact.",
        "synthesis": "2-3 sentences reconciling bull and bear into a net investment view.",
        "evidence": [
            {
                "source": "e.g. 'Q4 2024 Earnings Call' or 'FY2024 Income Statement'",
                "quote": "Exact quote or formatted metric e.g. 'Revenue: $94.9B (+6% YoY)'",
                "metric": "Optional short metric label e.g. 'Services Revenue YoY: +12%'",
                "significance": "2-3 sentences: why this evidence matters to the thesis"
            }
        ],
        "key_risks": [
            {
                "risk": "3-4 sentences describing the risk and potential magnitude.",
                "evidence": [
                    {
                        "source": "Source label",
                        "quote": "Supporting quote or metric",
                        "metric": "Optional metric label",
                        "significance": "2-3 sentences on why this evidence surfaces the risk"
                    }
                ],
                "severity": "One of: high / medium / low",
                "mitigants": "2-3 sentences: what could reduce or invalidate this risk"
            }
        ],
        "review_triggers": [
            "3-5 specific, measurable conditions that should prompt re-evaluation"
        ],
        "sentiment_summary": "1-2 sentences integrating the sentiment context"
    }

    context_block = (
        f"TICKER: {ticker}\n\n"
        f"INVESTOR GOAL PROFILE:\n{goal_context}\n\n"
        f"FINANCIAL SUMMARY:\n{financials_summary}\n\n"
        f"EARNINGS CALL EXTRACTION:\n{json.dumps(extraction, indent=2)}\n\n"
        f"SENTIMENT CONTEXT:\n{sentiment_summary}"
    )

    prompt = (
        f"You are a senior equity analyst generating an investment recommendation for {ticker}. "
        f"The investor has a specific goal profile — score and weight your analysis accordingly.\n\n"
        f"Generate a recommendation using ALL provided signals. Be specific: cite actual numbers, "
        f"direct quotes, and named risks. Avoid generic language. "
        f"The thesis and key risks must be detailed enough that a reader understands the proof behind each claim.\n\n"
        f"Return ONLY valid JSON matching this schema exactly:\n"
        f"{json.dumps(recommendation_schema, indent=2)}\n\n"
        f"Include 5-8 evidence items. Include 3-5 key risks ordered by severity. "
        f"Include 3-5 review triggers that are specific and measurable."
    )

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            system=context_block,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        data = json.loads(raw)

        thesis = AnalysisThesis(
            bull_case=data["bull_case"],
            bear_case=data["bear_case"],
            synthesis=data["synthesis"],
            evidence=[Evidence(**e) for e in data.get("evidence", [])],
        )

        risks = [
            KeyRisk(
                risk=r["risk"],
                evidence=[Evidence(**e) for e in r.get("evidence", [])],
                severity=r["severity"],
                mitigants=r["mitigants"],
            )
            for r in data.get("key_risks", [])
        ]

        return Recommendation(
            ticker=ticker,
            goal_profile=goal_profile,
            action=data["action"],
            confidence=data["confidence"],
            goal_alignment=data["goal_alignment"],
            thesis=thesis,
            key_risks=risks,
            review_triggers=data.get("review_triggers", []),
            sentiment_summary=data.get("sentiment_summary"),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    except (json.JSONDecodeError, KeyError):
        logger.warning("Claude synthesis returned invalid JSON for %s", ticker)
        return None
    except Exception:
        logger.exception("Claude synthesis failed for %s", ticker)
        return None
