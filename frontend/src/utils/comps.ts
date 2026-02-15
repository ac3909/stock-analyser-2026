import type { KeyRatios } from "../types/stock";

/** Ratio keys we compare across companies (excludes symbol and 52-week prices). */
const RATIO_KEYS: (keyof KeyRatios)[] = [
  "pe_ratio",
  "forward_pe",
  "peg_ratio",
  "price_to_book",
  "price_to_sales",
  "ev_to_ebitda",
  "profit_margin",
  "operating_margin",
  "return_on_equity",
  "return_on_assets",
  "debt_to_equity",
  "current_ratio",
  "quick_ratio",
  "dividend_yield",
  "beta",
];

/**
 * Compute the average value for each ratio across a set of companies.
 * Skips null values and returns null if no valid values exist for a metric.
 */
export function computeAverages(
  ratiosList: KeyRatios[]
): Record<string, number | null> {
  const result: Record<string, number | null> = {};

  for (const key of RATIO_KEYS) {
    const values = ratiosList
      .map((r) => r[key])
      .filter((v): v is number => v != null);
    result[key] =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
  }

  return result;
}

export { RATIO_KEYS };
