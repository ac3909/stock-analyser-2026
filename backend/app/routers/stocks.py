"""API router for stock data endpoints.

All endpoints are prefixed with /api/stocks and use the Yahoo Finance
data provider to fetch market data.
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.stock import (
    CompanyProfile,
    FinancialStatementResponse,
    HistoricalPrices,
    KeyRatios,
    SearchResponse,
)
from app.services.yahoo_finance import YahooFinanceProvider

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

provider = YahooFinanceProvider()


@router.get("/search", response_model=SearchResponse)
def search_tickers(q: str = Query(..., min_length=1, description="Search query")) -> SearchResponse:
    """Search for stock tickers matching a query string.

    Args:
        q: The search term — can be a company name or partial ticker symbol.

    Returns:
        A list of matching ticker results.
    """
    return provider.search_tickers(q)


@router.get("/{ticker}/profile", response_model=CompanyProfile)
def get_company_profile(ticker: str) -> CompanyProfile:
    """Fetch the company profile for a given ticker.

    Args:
        ticker: The stock ticker symbol (e.g. 'AAPL').

    Returns:
        Company profile with sector, industry, description, and market cap.

    Raises:
        HTTPException: 404 if the ticker is not found.
    """
    profile = provider.get_company_profile(ticker)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")
    return profile


@router.get("/{ticker}/prices", response_model=HistoricalPrices)
def get_historical_prices(
    ticker: str,
    period: str = Query("1y", description="Lookback period (1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
) -> HistoricalPrices:
    """Fetch historical OHLCV price data for a given ticker.

    Args:
        ticker: The stock ticker symbol.
        period: The lookback period (defaults to 1y).

    Returns:
        Historical daily price data for the requested period.

    Raises:
        HTTPException: 404 if no price data is found.
    """
    prices = provider.get_historical_prices(ticker, period)
    if prices is None:
        raise HTTPException(status_code=404, detail=f"No price data found for '{ticker}'")
    return prices


@router.get("/{ticker}/income-statement", response_model=FinancialStatementResponse)
def get_income_statement(ticker: str) -> FinancialStatementResponse:
    """Fetch annual income statements for a given ticker.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Annual income statement data with line items like revenue, net income, etc.

    Raises:
        HTTPException: 404 if no data is found.
    """
    statement = provider.get_income_statement(ticker)
    if statement is None:
        raise HTTPException(status_code=404, detail=f"No income statement data for '{ticker}'")
    return statement


@router.get("/{ticker}/balance-sheet", response_model=FinancialStatementResponse)
def get_balance_sheet(ticker: str) -> FinancialStatementResponse:
    """Fetch annual balance sheets for a given ticker.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Annual balance sheet data with assets, liabilities, and equity.

    Raises:
        HTTPException: 404 if no data is found.
    """
    statement = provider.get_balance_sheet(ticker)
    if statement is None:
        raise HTTPException(status_code=404, detail=f"No balance sheet data for '{ticker}'")
    return statement


@router.get("/{ticker}/cash-flow", response_model=FinancialStatementResponse)
def get_cash_flow(ticker: str) -> FinancialStatementResponse:
    """Fetch annual cash flow statements for a given ticker.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Annual cash flow data with operating, investing, and financing activities.

    Raises:
        HTTPException: 404 if no data is found.
    """
    statement = provider.get_cash_flow(ticker)
    if statement is None:
        raise HTTPException(status_code=404, detail=f"No cash flow data for '{ticker}'")
    return statement


@router.get("/{ticker}/ratios", response_model=KeyRatios)
def get_key_ratios(ticker: str) -> KeyRatios:
    """Fetch key financial ratios and valuation metrics for a given ticker.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Ratios including P/E, P/B, margins, ROE, debt-to-equity, and more.

    Raises:
        HTTPException: 404 if no data is found.
    """
    ratios = provider.get_key_ratios(ticker)
    if ratios is None:
        raise HTTPException(status_code=404, detail=f"No ratio data for '{ticker}'")
    return ratios
