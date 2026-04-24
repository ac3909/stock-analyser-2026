"""Pydantic models for portfolio, position, and user goal data."""

from typing import Literal
from pydantic import BaseModel


class UserGoal(BaseModel):
    id: str
    profile: Literal["high_growth", "balanced", "income", "defensive"]
    horizon: Literal["short", "medium", "long"]
    risk_tolerance: Literal["high", "medium", "low"]
    created_at: str
    updated_at: str


class UserGoalCreate(BaseModel):
    profile: Literal["high_growth", "balanced", "income", "defensive"]
    horizon: Literal["short", "medium", "long"]
    risk_tolerance: Literal["high", "medium", "low"]


class Portfolio(BaseModel):
    id: str
    name: str
    goal_id: str | None = None
    created_at: str
    updated_at: str


class PortfolioCreate(BaseModel):
    name: str
    goal_id: str | None = None


class Position(BaseModel):
    id: str
    portfolio_id: str
    ticker: str
    shares: float
    avg_cost: float
    created_at: str
    updated_at: str


class PositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_cost: float


class PositionUpdate(BaseModel):
    shares: float | None = None
    avg_cost: float | None = None


class PositionPerformance(BaseModel):
    id: str
    portfolio_id: str
    ticker: str
    shares: float
    avg_cost: float
    current_price: float | None
    current_value: float | None
    cost_basis: float
    gain_loss: float | None
    return_pct: float | None
    weight: float | None


class PortfolioPerformance(BaseModel):
    portfolio_id: str
    portfolio_name: str
    positions: list[PositionPerformance]
    total_value: float
    total_cost: float
    total_gain_loss: float
    total_return_pct: float


class PortfolioHistoryPoint(BaseModel):
    date: str
    value: float


class FactorScores(BaseModel):
    value: float
    quality: float
    growth: float
    momentum: float


class FactorCommentary(BaseModel):
    value: str
    quality: str
    growth: str
    momentum: str


class PortfolioScore(BaseModel):
    portfolio_id: str
    overall_score: int
    grade: str
    thesis: str
    strengths: list[str]
    risks: list[str]
    factor_scores: FactorScores
    factor_commentary: FactorCommentary
    recommendations: list[str]
    generated_at: str
