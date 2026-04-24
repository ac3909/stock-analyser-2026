"""Converts raw financial statement dicts into a concise text block for Claude.

Keeps Claude prompts focused and under token budget by pre-summarising
the most decision-relevant metrics rather than dumping raw statement rows.
"""

from typing import Any


def _fmt_billions(val: float | None) -> str:
    """Format a raw dollar value as $XB or $XM."""
    if val is None:
        return "N/A"
    if abs(val) >= 1e9:
        return f"${val / 1e9:.1f}B"
    if abs(val) >= 1e6:
        return f"${val / 1e6:.0f}M"
    return f"${val:.0f}"


def _pct(val: float | None) -> str:
    """Format a 0-1 ratio or a plain percentage."""
    if val is None:
        return "N/A"
    if abs(val) <= 1.5:
        return f"{val * 100:.1f}%"
    return f"{val:.1f}%"


def build_financials_summary(
    income_data: dict[str, Any] | None,
    ratios_data: Any | None,
) -> str:
    """Build a concise financial summary string for Claude context.

    Args:
        income_data: Dict from GET /income-statement (statements list with date + data keys).
        ratios_data: Dict or KeyRatios object from GET /ratios.

    Returns:
        Multi-line string summarising the most relevant financial metrics.
    """
    lines: list[str] = []

    if income_data and income_data.get("statements"):
        stmts = income_data["statements"]
        latest = stmts[0]["data"] if stmts else {}
        prior = stmts[1]["data"] if len(stmts) > 1 else {}
        latest_date = stmts[0].get("date", "Latest") if stmts else "Latest"

        rev = latest.get("Total Revenue")
        prior_rev = prior.get("Total Revenue")
        rev_growth = ""
        if rev and prior_rev and prior_rev != 0:
            growth_pct = (rev - prior_rev) / abs(prior_rev) * 100
            rev_growth = f" ({growth_pct:+.1f}% YoY)"

        op_inc = latest.get("Operating Income") or latest.get("Total Operating Income As Reported")
        net_inc = latest.get("Net Income") or latest.get("Net Income Common Stockholders")

        lines.append(f"== Income Statement ({latest_date}) ==")
        lines.append(f"Revenue: {_fmt_billions(rev)}{rev_growth}")
        lines.append(f"Operating Income: {_fmt_billions(op_inc)}")
        lines.append(f"Net Income: {_fmt_billions(net_inc)}")
        if rev and op_inc:
            lines.append(f"Operating Margin: {op_inc / rev * 100:.1f}%")
        if rev and net_inc:
            lines.append(f"Net Margin: {net_inc / rev * 100:.1f}%")

    if ratios_data:
        r = ratios_data if isinstance(ratios_data, dict) else ratios_data.__dict__
        lines.append("\n== Key Ratios ==")
        fields = [
            ("P/E Ratio", "pe_ratio", lambda v: f"{v:.1f}x"),
            ("Forward P/E", "forward_pe", lambda v: f"{v:.1f}x"),
            ("PEG Ratio", "peg_ratio", lambda v: f"{v:.2f}"),
            ("EV/EBITDA", "ev_to_ebitda", lambda v: f"{v:.1f}x"),
            ("ROE", "return_on_equity", _pct),
            ("Debt/Equity", "debt_to_equity", lambda v: f"{v:.2f}x"),
            ("Dividend Yield", "dividend_yield", _pct),
            ("Beta", "beta", lambda v: f"{v:.2f}"),
            ("52W High", "fifty_two_week_high", lambda v: f"${v:.2f}"),
            ("52W Low", "fifty_two_week_low", lambda v: f"${v:.2f}"),
        ]
        for label, key, fmt in fields:
            val = r.get(key) if isinstance(r, dict) else getattr(ratios_data, key, None)
            if val is not None:
                lines.append(f"{label}: {fmt(val)}")

    if not lines:
        return "No financial data available."

    return "\n".join(lines)
