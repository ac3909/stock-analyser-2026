"""Portfolio performance calculations: P&L per position and historical value."""

import logging

import yfinance as yf

from app.models.portfolio import (
    PortfolioHistoryPoint,
    PortfolioPerformance,
    PositionPerformance,
)
from app.services.portfolio_db import get_portfolio, get_positions
from app.services.yahoo_finance import YahooFinanceProvider

logger = logging.getLogger(__name__)

_provider = YahooFinanceProvider()


def calculate_portfolio_performance(portfolio_id: str) -> PortfolioPerformance | None:
    """Fetch current prices for all positions and compute P&L metrics."""
    portfolio = get_portfolio(portfolio_id)
    if not portfolio:
        return None
    positions = get_positions(portfolio_id)
    if not positions:
        return PortfolioPerformance(
            portfolio_id=portfolio.id,
            portfolio_name=portfolio.name,
            positions=[],
            total_value=0.0,
            total_cost=0.0,
            total_gain_loss=0.0,
            total_return_pct=0.0,
        )

    position_perfs: list[PositionPerformance] = []
    total_value = 0.0
    total_cost = 0.0

    for pos in positions:
        current_price = _provider.get_current_price(pos.ticker)
        cost_basis = round(pos.shares * pos.avg_cost, 2)
        current_value = round(pos.shares * current_price, 2) if current_price is not None else None
        gain_loss = round(current_value - cost_basis, 2) if current_value is not None else None
        return_pct = (current_price - pos.avg_cost) / pos.avg_cost if current_price is not None else None

        total_cost += cost_basis
        if current_value is not None:
            total_value += current_value

        position_perfs.append(
            PositionPerformance(
                id=pos.id,
                portfolio_id=pos.portfolio_id,
                ticker=pos.ticker,
                shares=pos.shares,
                avg_cost=pos.avg_cost,
                current_price=current_price,
                current_value=current_value,
                cost_basis=cost_basis,
                gain_loss=gain_loss,
                return_pct=return_pct,
                weight=None,
            )
        )

    for pf in position_perfs:
        pf.weight = (
            round(pf.current_value / total_value, 4)
            if (total_value > 0 and pf.current_value is not None)
            else None
        )

    total_gain_loss = round(total_value - total_cost, 2)
    total_return_pct = (total_gain_loss / total_cost) if total_cost > 0 else 0.0

    return PortfolioPerformance(
        portfolio_id=portfolio.id,
        portfolio_name=portfolio.name,
        positions=position_perfs,
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        total_gain_loss=total_gain_loss,
        total_return_pct=round(total_return_pct, 6),
    )


def get_portfolio_history(portfolio_id: str, period: str = "1y") -> list[PortfolioHistoryPoint]:
    """Return daily total portfolio value (current shares × historical price) for `period`."""
    positions = get_positions(portfolio_id)
    if not positions:
        return []

    tickers = [p.ticker for p in positions]
    shares_map = {p.ticker: p.shares for p in positions}

    try:
        data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
        if data.empty:
            return []

        if len(tickers) == 1:
            close_df = data[["Close"]].copy()
            close_df.columns = [tickers[0]]
        else:
            close_df = data["Close"].copy()

        for ticker in tickers:
            if ticker in close_df.columns:
                close_df[ticker] = close_df[ticker] * shares_map[ticker]

        close_df["portfolio_value"] = close_df[tickers].sum(axis=1)
        close_df = close_df.dropna(subset=["portfolio_value"])

        return [
            PortfolioHistoryPoint(date=str(idx.date()), value=round(float(val), 2))
            for idx, val in zip(close_df.index, close_df["portfolio_value"])
        ]
    except Exception:
        logger.exception("Error fetching portfolio history for '%s'", portfolio_id)
        return []
