"""Yahoo Finance implementation of the DataProvider interface.

Uses the yfinance library to fetch stock data from Yahoo Finance.
All methods handle errors gracefully — they return None or empty data
instead of raising exceptions.
"""

import logging

import pandas as pd
import yfinance as yf

from app.models.stock import (
    CompanyProfile,
    FinancialStatement,
    FinancialStatementResponse,
    HistoricalPrices,
    KeyRatios,
    PricePoint,
    SearchResponse,
    SearchResult,
)
from app.services.data_provider import DataProvider

logger = logging.getLogger(__name__)

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}


class YahooFinanceProvider(DataProvider):
    """Fetches stock market data from Yahoo Finance via yfinance."""

    def search_tickers(self, query: str) -> SearchResponse:
        """Search for tickers matching a query using yfinance's search.

        Args:
            query: The search term (company name or partial ticker).

        Returns:
            A SearchResponse with matching results. Returns empty results on error.
        """
        try:
            search = yf.Search(query)
            results: list[SearchResult] = []
            for quote in search.quotes:
                results.append(
                    SearchResult(
                        symbol=quote.get("symbol", ""),
                        name=quote.get("shortname", quote.get("longname", "")),
                        exchange=quote.get("exchange"),
                        type=quote.get("quoteType"),
                    )
                )
            return SearchResponse(results=results)
        except Exception:
            logger.exception("Error searching tickers for query '%s'", query)
            return SearchResponse(results=[])

    def get_company_profile(self, ticker: str) -> CompanyProfile | None:
        """Fetch company profile data from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol (e.g. 'AAPL').

        Returns:
            A CompanyProfile populated from Yahoo Finance info, or None on error.
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if not info or info.get("trailingPegRatio") is None and info.get("shortName") is None:
                return None
            return CompanyProfile(
                symbol=ticker.upper(),
                name=info.get("shortName", info.get("longName", ticker)),
                sector=info.get("sector"),
                industry=info.get("industry"),
                country=info.get("country"),
                website=info.get("website"),
                description=info.get("longBusinessSummary"),
                market_cap=info.get("marketCap"),
                employees=info.get("fullTimeEmployees"),
                currency=info.get("currency"),
                exchange=info.get("exchange"),
                logo_url=info.get("logo_url"),
            )
        except Exception:
            logger.exception("Error fetching profile for '%s'", ticker)
            return None

    def get_historical_prices(
        self, ticker: str, period: str = "1y"
    ) -> HistoricalPrices | None:
        """Fetch historical OHLCV price data from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol.
            period: The lookback period. Must be one of:
                    1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max.

        Returns:
            HistoricalPrices with daily price points, or None on error.
        """
        if period not in VALID_PERIODS:
            period = "1y"
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period=period)
            if df.empty:
                return None
            prices = [
                PricePoint(
                    date=idx.strftime("%Y-%m-%d"),
                    open=round(row["Open"], 2) if pd.notna(row["Open"]) else None,
                    high=round(row["High"], 2) if pd.notna(row["High"]) else None,
                    low=round(row["Low"], 2) if pd.notna(row["Low"]) else None,
                    close=round(row["Close"], 2) if pd.notna(row["Close"]) else None,
                    volume=int(row["Volume"]) if pd.notna(row["Volume"]) else None,
                )
                for idx, row in df.iterrows()
            ]
            return HistoricalPrices(
                symbol=ticker.upper(), period=period, prices=prices
            )
        except Exception:
            logger.exception("Error fetching prices for '%s'", ticker)
            return None

    def _parse_financial_df(self, df: pd.DataFrame) -> list[FinancialStatement]:
        """Convert a yfinance financial DataFrame into a list of FinancialStatements.

        Args:
            df: A DataFrame where columns are dates and rows are line items.

        Returns:
            A list of FinancialStatement objects, one per reporting period.
        """
        statements: list[FinancialStatement] = []
        if df is None or df.empty:
            return statements
        for col in df.columns:
            date_str = col.strftime("%Y-%m-%d") if hasattr(col, "strftime") else str(col)
            data: dict[str, float | None] = {}
            for item_name, value in df[col].items():
                data[str(item_name)] = (
                    round(float(value), 2) if pd.notna(value) else None
                )
            statements.append(FinancialStatement(date=date_str, data=data))
        return statements

    def get_income_statement(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch annual income statements from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual income statements, or None on error.
        """
        try:
            stock = yf.Ticker(ticker)
            df = stock.income_stmt
            statements = self._parse_financial_df(df)
            return FinancialStatementResponse(
                symbol=ticker.upper(),
                statement_type="income_statement",
                statements=statements,
            )
        except Exception:
            logger.exception("Error fetching income statement for '%s'", ticker)
            return None

    def get_balance_sheet(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch annual balance sheets from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual balance sheets, or None on error.
        """
        try:
            stock = yf.Ticker(ticker)
            df = stock.balance_sheet
            statements = self._parse_financial_df(df)
            return FinancialStatementResponse(
                symbol=ticker.upper(),
                statement_type="balance_sheet",
                statements=statements,
            )
        except Exception:
            logger.exception("Error fetching balance sheet for '%s'", ticker)
            return None

    def get_cash_flow(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch annual cash flow statements from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual cash flow statements, or None on error.
        """
        try:
            stock = yf.Ticker(ticker)
            df = stock.cashflow
            statements = self._parse_financial_df(df)
            return FinancialStatementResponse(
                symbol=ticker.upper(),
                statement_type="cash_flow",
                statements=statements,
            )
        except Exception:
            logger.exception("Error fetching cash flow for '%s'", ticker)
            return None

    def get_key_ratios(self, ticker: str) -> KeyRatios | None:
        """Fetch key financial ratios and valuation metrics from Yahoo Finance.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A KeyRatios object with valuation and profitability metrics, or None on error.
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if not info:
                return None
            return KeyRatios(
                symbol=ticker.upper(),
                pe_ratio=info.get("trailingPE"),
                forward_pe=info.get("forwardPE"),
                peg_ratio=info.get("trailingPegRatio"),
                price_to_book=info.get("priceToBook"),
                price_to_sales=info.get("priceToSalesTrailing12Months"),
                ev_to_ebitda=info.get("enterpriseToEbitda"),
                profit_margin=info.get("profitMargins"),
                operating_margin=info.get("operatingMargins"),
                return_on_equity=info.get("returnOnEquity"),
                return_on_assets=info.get("returnOnAssets"),
                debt_to_equity=info.get("debtToEquity"),
                current_ratio=info.get("currentRatio"),
                quick_ratio=info.get("quickRatio"),
                dividend_yield=info.get("dividendYield"),
                beta=info.get("beta"),
                fifty_two_week_high=info.get("fiftyTwoWeekHigh"),
                fifty_two_week_low=info.get("fiftyTwoWeekLow"),
            )
        except Exception:
            logger.exception("Error fetching ratios for '%s'", ticker)
            return None
