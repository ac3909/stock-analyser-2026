/** A single price data point for a macro indicator. */
export interface MacroPricePoint {
  date: string;
  close: number;
}

/** A source link attached to an AI summary. */
export interface SummarySource {
  title: string;
  url: string;
}

/** Structured AI summary with text and source links. */
export interface IndicatorSummary {
  text: string;
  sources: SummarySource[];
}

/** A macro indicator with current value and historical prices. */
export interface MacroIndicator {
  symbol: string;
  name: string;
  current_value: number | null;
  change_pct: number | null;
  prices: MacroPricePoint[];
  summary?: IndicatorSummary;
}

/** Summary of all macro indicators including Fear & Greed gauge. */
export interface MacroSummary {
  indicators: MacroIndicator[];
  fear_greed_label: string;
  fear_greed_vix: number | null;
}

/** A single news article from the headlines feed. */
export interface NewsArticle {
  title: string;
  description: string | null;
  source: string;
  url: string;
  image_url: string | null;
  published_at: string;
}
