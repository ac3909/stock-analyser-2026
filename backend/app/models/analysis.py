"""Pydantic models for evidence-based investment analysis output."""

from typing import Literal
from pydantic import BaseModel


class Evidence(BaseModel):
    """A single cited data point supporting the thesis or a risk."""
    source: str
    """Human-readable source label, e.g. 'Q4 2024 Earnings Call', 'FY2024 Income Statement'."""
    quote: str
    """Verbatim quote from transcript, or formatted metric: 'Revenue: $97.3B (+8% YoY)'."""
    metric: str | None = None
    """Optional structured metric label, e.g. 'Operating Margin FY2024: 31.2%'."""
    significance: str
    """2-3 sentences explaining why this evidence matters to the thesis."""


class KeyRisk(BaseModel):
    """A material risk to the investment thesis, with supporting evidence."""
    risk: str
    """3-4 sentence description of the risk and its potential impact."""
    evidence: list[Evidence]
    """2-3 pieces of evidence that surface or quantify this risk."""
    severity: Literal["high", "medium", "low"]
    mitigants: str
    """2-3 sentences on what factors could reduce or invalidate this risk."""


class AnalysisThesis(BaseModel):
    """The core investment thesis split into bull case, bear case, and synthesis."""
    bull_case: str
    """4-6 sentence bull case with specific references to evidence."""
    bear_case: str
    """3-4 sentence bear case grounded in identified risks."""
    synthesis: str
    """2-3 sentences that reconcile bull and bear cases into a net view."""
    evidence: list[Evidence]
    """5-8 key evidence points that most directly support the synthesis."""


class Recommendation(BaseModel):
    """Full investment recommendation for a ticker against a specific goal profile."""
    ticker: str
    goal_profile: Literal["high_growth", "balanced", "income", "defensive"]
    action: Literal["strong_buy", "buy", "hold", "trim", "sell"]
    confidence: Literal["high", "medium", "low"]
    thesis: AnalysisThesis
    key_risks: list[KeyRisk]
    """3-5 material risks ordered by severity."""
    goal_alignment: int
    """0-100 score: how well this stock fits the user's stated goal profile."""
    review_triggers: list[str]
    """3-5 specific, measurable conditions that should prompt re-evaluation."""
    sentiment_summary: str | None = None
    """Brief summary of retail sentiment and short interest context."""
    transcript_quarter: int | None = None
    transcript_year: int | None = None
    generated_at: str


class AnalysisRequest(BaseModel):
    goal_id: str
    force_refresh: bool = False
    """If True, bypass cached analysis and re-run the full pipeline."""
