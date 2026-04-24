"""API router for stock data endpoints.

All endpoints are prefixed with /api/stocks and use the Yahoo Finance
data provider to fetch market data.
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.stock import (
    CompanyProfile,
    FinancialStatementResponse,
    HistoricalPrices,
    IndustryAverages,
    IndustryRatios,
    KeyRatios,
    SearchResponse,
)
import httpx
import os

from app.services.yahoo_finance import YahooFinanceProvider, _get_crumb, _get_info, _session, _crumb_debug

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

provider = YahooFinanceProvider()


@router.get("/debug/{ticker}")
def debug_ticker(ticker: str) -> dict:
    """Diagnostic endpoint — returns raw API responses to diagnose cloud issues."""
    crumb = _get_crumb()
    info = _get_info(ticker)
    raw_resp = None
    raw_status = None
    try:
        params = {"modules": "price,summaryProfile", "crumb": crumb} if crumb else {"modules": "price,summaryProfile"}
        r = _session.get(
            f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker.upper()}",
            params=params, timeout=15,
        )
        raw_status = r.status_code
        raw_resp = r.json()
    except Exception as e:
        raw_resp = str(e)
    fmp_key = os.getenv("FMP_API_KEY", "")
    fmp_status = None
    fmp_resp = None
    try:
        r = httpx.get(
            f"https://financialmodelingprep.com/api/v3/profile/{ticker.upper()}",
            params={"apikey": fmp_key},
            timeout=10,
        )
        fmp_status = r.status_code
        fmp_resp = r.json()
    except Exception as e:
        fmp_resp = str(e)
    return {
        "fmp_key_set": bool(fmp_key),
        "fmp_key_prefix": fmp_key[:6] if fmp_key else None,
        "fmp_status": fmp_status,
        "fmp_response": fmp_resp,
        "info_keys": list(info.keys()),
        "crumb": crumb,
        "crumb_debug": _crumb_debug,
        "raw_status": raw_status,
    }


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


@router.get("/{ticker}/industry-averages", response_model=IndustryAverages)
def get_industry_averages(ticker: str) -> IndustryAverages:
    """Compute averaged financial metrics across industry peers.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Averaged operating margin, tax rate, capex/revenue, and revenue growth
        across companies in the same industry.

    Raises:
        HTTPException: 404 if no industry data is found.
    """
    averages = provider.get_industry_averages(ticker)
    if averages is None:
        raise HTTPException(status_code=404, detail=f"No industry data for '{ticker}'")
    return averages


@router.get("/{ticker}/industry-ratios", response_model=IndustryRatios)
def get_industry_ratios(ticker: str) -> IndustryRatios:
    """Compute averaged key ratios across industry peers.

    Args:
        ticker: The stock ticker symbol.

    Returns:
        Averaged key ratios (P/E, margins, ROE, etc.) across same-industry peers.

    Raises:
        HTTPException: 404 if no industry data is found.
    """
    ratios = provider.get_industry_ratios(ticker)
    if ratios is None:
        raise HTTPException(status_code=404, detail=f"No industry ratio data for '{ticker}'")
    return ratios


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


@router.get("/batch/ratios", response_model=list[KeyRatios])
def get_batch_ratios(
    tickers: str = Query(..., description="Comma-separated ticker symbols (max 10)"),
) -> list[KeyRatios]:
    """Fetch key ratios for multiple tickers at once.

    Args:
        tickers: Comma-separated ticker symbols (e.g. 'AAPL,MSFT,GOOG').

    Returns:
        A list of KeyRatios for each ticker that returned data.
    """
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:10]
    results: list[KeyRatios] = []
    for sym in symbols:
        ratios = provider.get_key_ratios(sym)
        if ratios:
            results.append(ratios)
    return results


@router.get("/batch/profiles", response_model=list[CompanyProfile])
def get_batch_profiles(
    tickers: str = Query(..., description="Comma-separated ticker symbols (max 10)"),
) -> list[CompanyProfile]:
    """Fetch company profiles for multiple tickers at once.

    Args:
        tickers: Comma-separated ticker symbols (e.g. 'AAPL,MSFT,GOOG').

    Returns:
        A list of CompanyProfile for each ticker that returned data.
    """
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:10]
    results: list[CompanyProfile] = []
    for sym in symbols:
        profile = provider.get_company_profile(sym)
        if profile:
            results.append(profile)
    return results


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
