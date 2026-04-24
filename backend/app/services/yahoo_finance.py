"""Yahoo Finance implementation of the DataProvider interface.

Uses the yfinance library to fetch stock data from Yahoo Finance.
All methods handle errors gracefully — they return None or empty data
instead of raising exceptions.
"""

import logging
from typing import Any

import pandas as pd
import requests
import yfinance as yf
from cachetools import TTLCache

from app.models.stock import (
    CompanyProfile,
    FinancialStatement,
    FinancialStatementResponse,
    HistoricalPrices,
    IndustryAverages,
    IndustryRatios,
    KeyRatios,
    PricePoint,
    SearchResponse,
    SearchResult,
)
from app.services.data_provider import DataProvider

logger = logging.getLogger(__name__)

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}

# Module-level TTL cache for stock.info dicts (5-minute TTL, up to 100 tickers)
_info_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=100, ttl=300)

# Shared session with browser User-Agent to avoid Yahoo Finance cloud IP blocks
_session = requests.Session()
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
})


def _get_info(ticker: str) -> dict[str, Any]:
    """Fetch stock.info with caching to avoid redundant Yahoo Finance calls.

    Multiple endpoints (profile, ratios, industry peers) all need the same
    info dict. This cache ensures each ticker is only fetched once per 5 minutes.
    """
    key = ticker.upper()
    if key in _info_cache:
        return _info_cache[key]
    info = yf.Ticker(ticker, session=_session).info or {}
    _info_cache[key] = info
    return info


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
            search = yf.Search(query, session=_session)
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
            info = _get_info(ticker)
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
                shares_outstanding=info.get("sharesOutstanding"),
                current_price=info.get("currentPrice"),
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
            stock = yf.Ticker(ticker, session=_session)
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
            stock = yf.Ticker(ticker, session=_session)
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
            stock = yf.Ticker(ticker, session=_session)
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
            stock = yf.Ticker(ticker, session=_session)
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
            info = _get_info(ticker)
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

    def get_current_price(self, ticker: str) -> float | None:
        """Fetch the current market price for a ticker using the info cache."""
        try:
            info = _get_info(ticker)
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            return float(price) if price is not None else None
        except Exception:
            logger.exception("Error fetching current price for '%s'", ticker)
            return None

    def get_industry_averages(self, ticker: str) -> IndustryAverages | None:
        """Compute averaged financial metrics across industry peers.

        Uses yfinance's Industry class to find peers, then fetches their
        income statements and cash flows to compute average margins,
        tax rates, capex ratios, and revenue growth.

        Args:
            ticker: The stock ticker symbol to find peers for.

        Returns:
            An IndustryAverages with mean metrics, or None on error.
        """
        try:
            result = self._find_peer_symbols(ticker)
            if result is None:
                return None
            industry_name, peer_symbols = result

            # Collect metrics from each peer
            op_margins: list[float] = []
            tax_rates: list[float] = []
            capex_pcts: list[float] = []
            rev_growths: list[float] = []

            for sym in peer_symbols:
                try:
                    peer = yf.Ticker(sym, session=_session)

                    # Income statement for margins, tax rate, and revenue growth
                    inc = peer.income_stmt
                    if inc is not None and not inc.empty and len(inc.columns) >= 1:
                        latest = inc.iloc[:, 0]
                        revenue = latest.get("Total Revenue")
                        op_income = latest.get("Operating Income")
                        tax_provision = latest.get("Tax Provision")
                        pretax = latest.get("Pretax Income")

                        if pd.notna(revenue) and revenue != 0:
                            if pd.notna(op_income):
                                op_margins.append(op_income / revenue * 100)
                            if pd.notna(tax_provision) and pd.notna(pretax) and pretax != 0:
                                tax_rates.append(tax_provision / pretax * 100)

                        # Revenue growth from two most recent years
                        if len(inc.columns) >= 2:
                            prev_revenue = inc.iloc[:, 1].get("Total Revenue")
                            if (
                                pd.notna(revenue)
                                and pd.notna(prev_revenue)
                                and prev_revenue != 0
                            ):
                                growth = (revenue - prev_revenue) / abs(prev_revenue) * 100
                                rev_growths.append(growth)

                    # Cash flow for capex ratio
                    cf = peer.cashflow
                    if cf is not None and not cf.empty and len(cf.columns) >= 1:
                        latest_cf = cf.iloc[:, 0]
                        capex = latest_cf.get("Capital Expenditure")
                        if pd.notna(capex) and pd.notna(revenue) and revenue != 0:
                            capex_pcts.append(abs(capex) / revenue * 100)

                except Exception:
                    logger.debug("Skipping peer '%s' due to error", sym)
                    continue

            def _avg(values: list[float]) -> float | None:
                return round(sum(values) / len(values), 2) if values else None

            return IndustryAverages(
                industry=industry_name,
                peer_count=len(peer_symbols),
                operating_margin=_avg(op_margins),
                tax_rate=_avg(tax_rates),
                capex_pct_revenue=_avg(capex_pcts),
                revenue_growth=_avg(rev_growths),
            )
        except Exception:
            logger.exception("Error computing industry averages for '%s'", ticker)
            return None

    def _find_peer_symbols(self, ticker: str) -> tuple[str, list[str]] | None:
        """Find peer ticker symbols in the same industry.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A tuple of (industry_name, peer_symbols) or None on error.
        """
        try:
            info = _get_info(ticker)
            industry_key = info.get("industryKey", "")
            industry_name = info.get("industry", "Unknown")
            if not industry_key:
                return None

            ind = yf.Industry(industry_key, session=_session)
            top_df = ind.top_companies
            if top_df is None or top_df.empty:
                return None

            peer_symbols = [
                sym for sym in top_df.index.tolist()
                if sym != ticker.upper()
            ][:10]

            return (industry_name, peer_symbols) if peer_symbols else None
        except Exception:
            logger.exception("Error finding peers for '%s'", ticker)
            return None

    def get_industry_ratios(self, ticker: str) -> IndustryRatios | None:
        """Compute averaged key ratios across industry peers.

        Fetches key ratios for each peer using yfinance info and averages
        them to produce industry benchmark values.

        Args:
            ticker: The stock ticker symbol to find peers for.

        Returns:
            An IndustryRatios with mean metrics, or None on error.
        """
        result = self._find_peer_symbols(ticker)
        if result is None:
            return None
        industry_name, peer_symbols = result

        # Ratio fields to average (must match IndustryRatios field names)
        ratio_fields = [
            ("pe_ratio", "trailingPE"),
            ("forward_pe", "forwardPE"),
            ("peg_ratio", "trailingPegRatio"),
            ("price_to_book", "priceToBook"),
            ("price_to_sales", "priceToSalesTrailing12Months"),
            ("ev_to_ebitda", "enterpriseToEbitda"),
            ("profit_margin", "profitMargins"),
            ("operating_margin", "operatingMargins"),
            ("return_on_equity", "returnOnEquity"),
            ("return_on_assets", "returnOnAssets"),
            ("debt_to_equity", "debtToEquity"),
            ("current_ratio", "currentRatio"),
            ("quick_ratio", "quickRatio"),
            ("dividend_yield", "dividendYield"),
            ("beta", "beta"),
        ]

        # Collect values for each field across peers
        collected: dict[str, list[float]] = {f: [] for f, _ in ratio_fields}

        for sym in peer_symbols:
            try:
                info = _get_info(sym)
                if not info:
                    continue
                for field_name, yf_key in ratio_fields:
                    val = info.get(yf_key)
                    if val is not None:
                        collected[field_name].append(float(val))
            except Exception:
                logger.debug("Skipping peer '%s' due to error", sym)
                continue

        def _avg(values: list[float]) -> float | None:
            return round(sum(values) / len(values), 2) if values else None

        return IndustryRatios(
            industry=industry_name,
            peer_count=len(peer_symbols),
            **{field: _avg(collected[field]) for field, _ in ratio_fields},
        )
