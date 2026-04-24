"""Factor-based portfolio scoring with Claude narrative synthesis."""

import json
import logging
import os
from datetime import datetime, timezone

import anthropic
from cachetools import TTLCache

from app.models.portfolio import (
    FactorCommentary,
    FactorScores,
    PortfolioPerformance,
    PortfolioScore,
    PositionPerformance,
)
from app.services.yahoo_finance import YahooFinanceProvider

logger = logging.getLogger(__name__)

_provider = YahooFinanceProvider()
_score_cache: TTLCache[str, PortfolioScore] = TTLCache(maxsize=50, ttl=600)


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _score_value(ratios) -> float:
    if not ratios:
        return 50.0
    scores = []
    if ratios.pe_ratio and 0 < ratios.pe_ratio < 200:
        scores.append(_clamp(100 - (ratios.pe_ratio - 10) * 2.0))
    if ratios.price_to_book and ratios.price_to_book > 0:
        scores.append(_clamp(100 - (ratios.price_to_book - 1) * 15.0))
    if ratios.ev_to_ebitda and 0 < ratios.ev_to_ebitda < 100:
        scores.append(_clamp(100 - (ratios.ev_to_ebitda - 8) * 3.0))
    return round(sum(scores) / len(scores), 1) if scores else 50.0


def _score_quality(ratios) -> float:
    if not ratios:
        return 50.0
    scores = []
    if ratios.return_on_equity is not None:
        scores.append(_clamp(ratios.return_on_equity * 300.0))
    if ratios.profit_margin is not None:
        scores.append(_clamp(ratios.profit_margin * 500.0))
    if ratios.debt_to_equity is not None and ratios.debt_to_equity >= 0:
        scores.append(_clamp(100 - ratios.debt_to_equity * 20.0))
    return round(sum(scores) / len(scores), 1) if scores else 50.0


def _score_growth(ratios) -> float:
    if not ratios:
        return 50.0
    scores = []
    if ratios.peg_ratio and 0 < ratios.peg_ratio < 10:
        scores.append(_clamp(100 - (ratios.peg_ratio - 0.5) * 20.0))
    if ratios.pe_ratio and ratios.forward_pe and ratios.pe_ratio > 0 and ratios.forward_pe > 0:
        growth_signal = (ratios.pe_ratio - ratios.forward_pe) / ratios.pe_ratio
        scores.append(_clamp(50 + growth_signal * 200.0))
    return round(sum(scores) / len(scores), 1) if scores else 50.0


def _score_momentum(ratios, current_price: float | None) -> float:
    if not ratios or not current_price:
        return 50.0
    scores = []
    hi = ratios.fifty_two_week_high
    lo = ratios.fifty_two_week_low
    if hi and lo and hi > lo:
        range_pct = (current_price - lo) / (hi - lo)
        scores.append(_clamp(range_pct * 100.0))
    return round(sum(scores) / len(scores), 1) if scores else 50.0


def _compute_risk_flags(positions: list[PositionPerformance]) -> list[str]:
    flags = []
    total_value = sum(p.current_value or p.cost_basis for p in positions)
    for p in positions:
        val = p.current_value or p.cost_basis
        if total_value > 0 and val / total_value > 0.30:
            flags.append(
                f"Concentration: {p.ticker} represents {val / total_value * 100:.0f}% of portfolio"
            )
    if len(positions) < 5:
        flags.append(
            f"Diversification: only {len(positions)} holding(s) (10+ recommended)"
        )
    return flags


def _build_factor_scores(positions: list[PositionPerformance]) -> FactorScores:
    total_val = sum(p.current_value or p.cost_basis for p in positions) or 1.0
    factors = {"value": 0.0, "quality": 0.0, "growth": 0.0, "momentum": 0.0}
    for pos in positions:
        w = (pos.current_value or pos.cost_basis) / total_val
        ratios = _provider.get_key_ratios(pos.ticker)
        factors["value"] += _score_value(ratios) * w
        factors["quality"] += _score_quality(ratios) * w
        factors["growth"] += _score_growth(ratios) * w
        factors["momentum"] += _score_momentum(ratios, pos.current_price) * w
    return FactorScores(**{k: round(v, 1) for k, v in factors.items()})


def _claude_narrative(
    portfolio_name: str,
    positions: list[PositionPerformance],
    factor_scores: FactorScores,
    risk_flags: list[str],
) -> dict:
    total_val = sum(p.current_value or p.cost_basis for p in positions) or 1.0
    holdings_lines = [
        f"  {p.ticker}: {p.shares} shares, avg cost ${p.avg_cost:.2f}, "
        f"current ${'N/A' if p.current_price is None else f'{p.current_price:.2f}'}, "
        f"weight {(p.current_value or p.cost_basis) / total_val * 100:.1f}%"
        for p in positions
    ]

    prompt = (
        "You are a quantitative portfolio analyst. Assess this portfolio using factor investing principles.\n\n"
        f"Portfolio: {portfolio_name}\n\nHoldings:\n"
        + "\n".join(holdings_lines)
        + f"\n\nFactor Scores (0-100, higher = better):\n"
        f"  Value:    {factor_scores.value:.0f}/100  (valuation: P/E, P/B, EV/EBITDA)\n"
        f"  Quality:  {factor_scores.quality:.0f}/100  (ROE, profit margins, low debt)\n"
        f"  Growth:   {factor_scores.growth:.0f}/100  (PEG ratio, forward vs trailing P/E)\n"
        f"  Momentum: {factor_scores.momentum:.0f}/100  (price position in 52-week range)\n\n"
        f"Risk Flags: {', '.join(risk_flags) if risk_flags else 'None identified'}\n\n"
        'Respond with valid JSON only (no markdown code fences):\n'
        '{\n'
        '  "overall_score": <integer 0-100>,\n'
        '  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",\n'
        '  "thesis": "<2-3 sentences on portfolio character and key driver>",\n'
        '  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],\n'
        '  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],\n'
        '  "factor_commentary": {\n'
        '    "value": "<1 sentence>",\n'
        '    "quality": "<1 sentence>",\n'
        '    "growth": "<1 sentence>",\n'
        '    "momentum": "<1 sentence>"\n'
        '  },\n'
        '  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]\n'
        '}'
    )

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def score_portfolio(perf: PortfolioPerformance) -> PortfolioScore | None:
    """Compute factor scores and generate Claude narrative for a portfolio."""
    cache_key = perf.portfolio_id
    if cache_key in _score_cache:
        return _score_cache[cache_key]

    if not perf.positions:
        return None

    factor_scores = _build_factor_scores(perf.positions)
    risk_flags = _compute_risk_flags(perf.positions)

    try:
        data = _claude_narrative(perf.portfolio_name, perf.positions, factor_scores, risk_flags)
    except Exception:
        logger.exception("Claude narrative failed for portfolio '%s'", perf.portfolio_id)
        return None

    result = PortfolioScore(
        portfolio_id=perf.portfolio_id,
        overall_score=int(data.get("overall_score", 50)),
        grade=data.get("grade", "C"),
        thesis=data.get("thesis", ""),
        strengths=data.get("strengths", []),
        risks=data.get("risks", []),
        factor_scores=factor_scores,
        factor_commentary=FactorCommentary(
            **data.get(
                "factor_commentary",
                {"value": "", "quality": "", "growth": "", "momentum": ""},
            )
        ),
        recommendations=data.get("recommendations", []),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
    _score_cache[cache_key] = result
    return result
