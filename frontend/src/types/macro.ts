/** A single price data point for a macro indicator. */
export interface MacroPricePoint {
  date: string;
  close: number;
}

/** A macro indicator with current value and historical prices. */
export interface MacroIndicator {
  symbol: string;
  name: string;
  current_value: number | null;
  change_pct: number | null;
  prices: MacroPricePoint[];
}

/** Summary of all macro indicators including Fear & Greed gauge. */
export interface MacroSummary {
  indicators: MacroIndicator[];
  fear_greed_label: string;
  fear_greed_vix: number | null;
}
