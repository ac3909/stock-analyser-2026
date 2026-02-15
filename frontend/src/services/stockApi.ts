import api from "./api";
import type {
  SearchResponse,
  CompanyProfile,
  HistoricalPrices,
  FinancialStatementResponse,
  IndustryAverages,
  KeyRatios,
} from "../types/stock";

/** Search for tickers matching a query string. */
export async function searchTickers(query: string): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>("/api/stocks/search", {
    params: { q: query },
  });
  return data;
}

/** Fetch the company profile for a ticker. */
export async function getCompanyProfile(
  ticker: string
): Promise<CompanyProfile> {
  const { data } = await api.get<CompanyProfile>(
    `/api/stocks/${ticker}/profile`
  );
  return data;
}

/** Fetch historical price data for a ticker. */
export async function getHistoricalPrices(
  ticker: string,
  period: string = "1y"
): Promise<HistoricalPrices> {
  const { data } = await api.get<HistoricalPrices>(
    `/api/stocks/${ticker}/prices`,
    { params: { period } }
  );
  return data;
}

/** Fetch the income statement for a ticker. */
export async function getIncomeStatement(
  ticker: string
): Promise<FinancialStatementResponse> {
  const { data } = await api.get<FinancialStatementResponse>(
    `/api/stocks/${ticker}/income-statement`
  );
  return data;
}

/** Fetch the balance sheet for a ticker. */
export async function getBalanceSheet(
  ticker: string
): Promise<FinancialStatementResponse> {
  const { data } = await api.get<FinancialStatementResponse>(
    `/api/stocks/${ticker}/balance-sheet`
  );
  return data;
}

/** Fetch the cash flow statement for a ticker. */
export async function getCashFlow(
  ticker: string
): Promise<FinancialStatementResponse> {
  const { data } = await api.get<FinancialStatementResponse>(
    `/api/stocks/${ticker}/cash-flow`
  );
  return data;
}

/** Fetch key financial ratios for a ticker. */
export async function getKeyRatios(ticker: string): Promise<KeyRatios> {
  const { data } = await api.get<KeyRatios>(`/api/stocks/${ticker}/ratios`);
  return data;
}

/** Fetch industry-averaged financial metrics for a ticker's peers. */
export async function getIndustryAverages(
  ticker: string
): Promise<IndustryAverages> {
  const { data } = await api.get<IndustryAverages>(
    `/api/stocks/${ticker}/industry-averages`
  );
  return data;
}

/** Fetch key ratios for multiple tickers at once (for comparables). */
export async function getBatchRatios(tickers: string[]): Promise<KeyRatios[]> {
  const { data } = await api.get<KeyRatios[]>("/api/stocks/batch/ratios", {
    params: { tickers: tickers.join(",") },
  });
  return data;
}

/** Fetch company profiles for multiple tickers at once (for comparables). */
export async function getBatchProfiles(
  tickers: string[]
): Promise<CompanyProfile[]> {
  const { data } = await api.get<CompanyProfile[]>(
    "/api/stocks/batch/profiles",
    { params: { tickers: tickers.join(",") } }
  );
  return data;
}
