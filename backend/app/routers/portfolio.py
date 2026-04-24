"""API router for portfolio and position management."""

from fastapi import APIRouter, HTTPException

from app.models.portfolio import (
    Portfolio,
    PortfolioCreate,
    PortfolioHistoryPoint,
    PortfolioPerformance,
    PortfolioScore,
    Position,
    PositionCreate,
    PositionUpdate,
)
from app.services.portfolio_db import (
    add_position,
    create_portfolio,
    delete_position,
    get_portfolio,
    get_positions,
    list_portfolios,
    update_position,
)
from app.services.portfolio_performance import (
    calculate_portfolio_performance,
    get_portfolio_history,
)
from app.services.portfolio_scoring import score_portfolio

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("", response_model=Portfolio)
def create_new_portfolio(body: PortfolioCreate) -> Portfolio:
    portfolio = create_portfolio(name=body.name, goal_id=body.goal_id)
    if portfolio is None:
        raise HTTPException(status_code=500, detail="Failed to create portfolio")
    return portfolio


@router.get("", response_model=list[Portfolio])
def list_all_portfolios() -> list[Portfolio]:
    return list_portfolios()


@router.get("/{portfolio_id}", response_model=Portfolio)
def get_single_portfolio(portfolio_id: str) -> Portfolio:
    portfolio = get_portfolio(portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail=f"Portfolio '{portfolio_id}' not found")
    return portfolio


@router.get("/{portfolio_id}/positions", response_model=list[Position])
def get_portfolio_positions(portfolio_id: str) -> list[Position]:
    return get_positions(portfolio_id)


@router.post("/{portfolio_id}/positions", response_model=Position)
def add_portfolio_position(portfolio_id: str, body: PositionCreate) -> Position:
    position = add_position(
        portfolio_id=portfolio_id,
        ticker=body.ticker,
        shares=body.shares,
        avg_cost=body.avg_cost,
    )
    if position is None:
        raise HTTPException(status_code=500, detail="Failed to add position")
    return position


@router.patch("/positions/{position_id}", response_model=Position)
def update_portfolio_position(position_id: str, body: PositionUpdate) -> Position:
    position = update_position(position_id, shares=body.shares, avg_cost=body.avg_cost)
    if position is None:
        raise HTTPException(status_code=404, detail=f"Position '{position_id}' not found")
    return position


@router.delete("/positions/{position_id}", status_code=204)
def remove_position(position_id: str) -> None:
    if not delete_position(position_id):
        raise HTTPException(status_code=404, detail=f"Position '{position_id}' not found")


@router.get("/{portfolio_id}/performance", response_model=PortfolioPerformance)
def get_performance(portfolio_id: str) -> PortfolioPerformance:
    result = calculate_portfolio_performance(portfolio_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return result


@router.get("/{portfolio_id}/history", response_model=list[PortfolioHistoryPoint])
def get_history(portfolio_id: str, period: str = "1y") -> list[PortfolioHistoryPoint]:
    return get_portfolio_history(portfolio_id, period)


@router.get("/{portfolio_id}/score", response_model=PortfolioScore)
def get_score(portfolio_id: str) -> PortfolioScore:
    perf = calculate_portfolio_performance(portfolio_id)
    if perf is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    result = score_portfolio(perf)
    if result is None:
        raise HTTPException(status_code=422, detail="Portfolio has no positions to score")
    return result
