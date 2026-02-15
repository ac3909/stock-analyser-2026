import type { MultiplesInputs, MultiplesResults } from "../types/stock";

/**
 * Calculate an implied share price using a comparable multiples approach.
 *
 * Supports three modes:
 * - P/E: projected EPS × target P/E = implied price
 * - EV/Revenue or EV/EBITDA: metric × multiple = implied EV,
 *   then subtract net debt and divide by shares.
 */
export function calculateMultiples(
  inputs: MultiplesInputs,
  currentPrice: number
): MultiplesResults {
  const {
    multiple_type,
    projected_metric_value,
    target_multiple,
    shares_outstanding,
    net_debt,
  } = inputs;

  let implied_share_price: number;
  let implied_value: number;

  if (multiple_type === "pe") {
    // P/E: metric is EPS
    implied_share_price = projected_metric_value * target_multiple;
    implied_value =
      shares_outstanding > 0 ? implied_share_price * shares_outstanding : 0;
  } else {
    // EV-based: metric is revenue or EBITDA
    const impliedEv = projected_metric_value * target_multiple;
    const equityValue = impliedEv - net_debt;
    implied_value = equityValue;
    implied_share_price =
      shares_outstanding > 0 ? equityValue / shares_outstanding : 0;
  }

  const upside_pct =
    currentPrice > 0
      ? ((implied_share_price - currentPrice) / currentPrice) * 100
      : 0;

  return {
    implied_value,
    implied_share_price,
    current_price: currentPrice,
    upside_pct,
  };
}
