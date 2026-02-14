/** TypeScript types matching the backend Pydantic models. */

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  market_cap: number | null;
  employees: number | null;
  currency: string | null;
  exchange: string | null;
  logo_url: string | null;
}

export interface PricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface HistoricalPrices {
  symbol: string;
  period: string;
  prices: PricePoint[];
}

export interface FinancialStatement {
  date: string;
  data: Record<string, number | null>;
}

export interface FinancialStatementResponse {
  symbol: string;
  statement_type: string;
  statements: FinancialStatement[];
}

export interface KeyRatios {
  symbol: string;
  pe_ratio: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  price_to_book: number | null;
  price_to_sales: number | null;
  ev_to_ebitda: number | null;
  profit_margin: number | null;
  operating_margin: number | null;
  return_on_equity: number | null;
  return_on_assets: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  dividend_yield: number | null;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
}
