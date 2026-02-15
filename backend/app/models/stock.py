"""Pydantic response models for stock data endpoints."""

from typing import Any

from pydantic import BaseModel


class SearchResult(BaseModel):
    """A single ticker search result."""

    symbol: str
    name: str
    exchange: str | None = None
    type: str | None = None


class SearchResponse(BaseModel):
    """Response for the ticker search endpoint."""

    results: list[SearchResult]


class CompanyProfile(BaseModel):
    """Core company information and metadata."""

    symbol: str
    name: str
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    website: str | None = None
    description: str | None = None
    market_cap: float | None = None
    employees: int | None = None
    currency: str | None = None
    exchange: str | None = None
    logo_url: str | None = None
    shares_outstanding: float | None = None
    current_price: float | None = None


class PricePoint(BaseModel):
    """A single historical price data point."""

    date: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None


class HistoricalPrices(BaseModel):
    """Response for historical price data."""

    symbol: str
    period: str
    prices: list[PricePoint]


class FinancialStatement(BaseModel):
    """A single period's financial statement as key-value pairs.

    Keys are line-item names (e.g. 'Total Revenue'), values are amounts.
    """

    date: str
    data: dict[str, float | None]


class FinancialStatementResponse(BaseModel):
    """Response for income statement, balance sheet, or cash flow endpoints."""

    symbol: str
    statement_type: str
    statements: list[FinancialStatement]


class KeyRatios(BaseModel):
    """Key financial ratios and valuation metrics for a company."""

    symbol: str
    pe_ratio: float | None = None
    forward_pe: float | None = None
    peg_ratio: float | None = None
    price_to_book: float | None = None
    price_to_sales: float | None = None
    ev_to_ebitda: float | None = None
    profit_margin: float | None = None
    operating_margin: float | None = None
    return_on_equity: float | None = None
    return_on_assets: float | None = None
    debt_to_equity: float | None = None
    current_ratio: float | None = None
    quick_ratio: float | None = None
    dividend_yield: float | None = None
    beta: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None


class IndustryAverages(BaseModel):
    """Averaged financial metrics across industry peers."""

    industry: str
    peer_count: int
    operating_margin: float | None = None
    tax_rate: float | None = None
    capex_pct_revenue: float | None = None
    revenue_growth: float | None = None


class Projection(BaseModel):
    """A saved projection/scenario from the database."""

    id: str
    ticker: str
    title: str
    data: dict[str, Any]
    created_at: str
    updated_at: str


class ProjectionCreate(BaseModel):
    """Request body to create a new projection."""

    ticker: str
    title: str
    data: dict[str, Any]


class ProjectionUpdate(BaseModel):
    """Request body to update an existing projection."""

    title: str | None = None
    data: dict[str, Any] | None = None
