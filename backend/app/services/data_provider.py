"""Abstract base class for stock data providers.

Defines the interface that all data providers (Yahoo Finance, Alpha Vantage, etc.)
must implement. This allows swapping providers without changing the rest of the app.
"""

from abc import ABC, abstractmethod

from app.models.stock import (
    CompanyProfile,
    FinancialStatementResponse,
    HistoricalPrices,
    KeyRatios,
    SearchResponse,
)


class DataProvider(ABC):
    """Abstract interface for fetching stock market data."""

    @abstractmethod
    def search_tickers(self, query: str) -> SearchResponse:
        """Search for tickers matching a query string.

        Args:
            query: The search term (company name or partial ticker).

        Returns:
            A SearchResponse containing matching ticker results.
        """

    @abstractmethod
    def get_company_profile(self, ticker: str) -> CompanyProfile | None:
        """Fetch the company profile for a given ticker.

        Args:
            ticker: The stock ticker symbol (e.g. 'AAPL').

        Returns:
            A CompanyProfile if found, or None if the ticker is invalid.
        """

    @abstractmethod
    def get_historical_prices(
        self, ticker: str, period: str = "1y"
    ) -> HistoricalPrices | None:
        """Fetch historical price data for a given ticker.

        Args:
            ticker: The stock ticker symbol.
            period: The lookback period (e.g. '1mo', '6mo', '1y', '5y', 'max').

        Returns:
            HistoricalPrices if found, or None if the ticker is invalid.
        """

    @abstractmethod
    def get_income_statement(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch the income statement for a given ticker.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual income statements, or None.
        """

    @abstractmethod
    def get_balance_sheet(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch the balance sheet for a given ticker.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual balance sheets, or None.
        """

    @abstractmethod
    def get_cash_flow(self, ticker: str) -> FinancialStatementResponse | None:
        """Fetch the cash flow statement for a given ticker.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A FinancialStatementResponse with annual cash flow statements, or None.
        """

    @abstractmethod
    def get_key_ratios(self, ticker: str) -> KeyRatios | None:
        """Fetch key financial ratios for a given ticker.

        Args:
            ticker: The stock ticker symbol.

        Returns:
            A KeyRatios object if found, or None if the ticker is invalid.
        """
