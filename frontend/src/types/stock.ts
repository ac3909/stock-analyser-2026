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
  shares_outstanding: number | null;
  current_price: number | null;
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

/** A saved projection/scenario from Supabase. */
export interface Projection {
  id: string;
  ticker: string;
  title: string;
  data: ProjectionData;
  created_at: string;
  updated_at: string;
}

/** The JSONB payload stored in a projection's data field. */
export type ProjectionData =
  | { model_type: "dcf"; inputs: DcfInputs; results: DcfResults }
  | { model_type: "multiples"; inputs: MultiplesInputs; results: MultiplesResults };

/** DCF model user-adjustable inputs — all assumption fields are per-year arrays. */
export interface DcfInputs {
  revenue_growth_rates: number[];
  operating_margins: number[];
  tax_rates: number[];
  capex_pct_revenues: number[];
  wacc: number;
  terminal_growth_rate: number;
  shares_outstanding: number;
  base_revenue: number;
}

/** Detailed computed values for a single projected year. */
export interface DcfYearDetail {
  revenue: number;
  revenue_growth: number;
  operating_income: number;
  operating_margin: number;
  taxes: number;
  tax_rate: number;
  nopat: number;
  capex: number;
  capex_pct: number;
  fcf: number;
  discount_factor: number;
  pv_fcf: number;
}

/** DCF model computed outputs. */
export interface DcfResults {
  years: DcfYearDetail[];
  projected_revenues: number[];
  projected_fcfs: number[];
  terminal_value: number;
  pv_terminal_value: number;
  enterprise_value: number;
  implied_share_price: number;
  current_price: number;
  upside_pct: number;
}

/** Averaged financial metrics across industry peers (from backend). */
export interface IndustryAverages {
  industry: string;
  peer_count: number;
  operating_margin: number | null;
  tax_rate: number | null;
  capex_pct_revenue: number | null;
  revenue_growth: number | null;
}

/** Company's own historical averages computed from financial statements. */
export interface CompanyAverages {
  operating_margin: number | null;
  tax_rate: number | null;
  capex_pct_revenue: number | null;
  revenue_growth: number | null;
}

/** Multiples model user-adjustable inputs. */
export interface MultiplesInputs {
  multiple_type: "pe" | "ev_revenue" | "ev_ebitda";
  projected_metric_value: number;
  target_multiple: number;
  shares_outstanding: number;
  net_debt: number;
}

/** Multiples model computed outputs. */
export interface MultiplesResults {
  implied_value: number;
  implied_share_price: number;
  current_price: number;
  upside_pct: number;
}
