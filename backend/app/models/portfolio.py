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
