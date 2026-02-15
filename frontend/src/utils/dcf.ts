import type { DcfInputs, DcfResults, DcfYearDetail } from "../types/stock";

/**
 * Calculate a 5-year Discounted Cash Flow valuation.
 *
 * All assumption inputs (margins, tax rates, capex) are per-year arrays,
 * allowing the user to model changing assumptions over the projection period.
 * Returns detailed per-year breakdowns alongside summary valuation metrics.
 */
export function calculateDcf(
  inputs: DcfInputs,
  currentPrice: number
): DcfResults {
  const {
    revenue_growth_rates,
    operating_margins,
    tax_rates,
    capex_pct_revenues,
    wacc,
    terminal_growth_rate,
    shares_outstanding,
    base_revenue,
  } = inputs;

  const waccDecimal = wacc / 100;
  const termGrowthDecimal = terminal_growth_rate / 100;

  // Build per-year details
  const years: DcfYearDetail[] = [];
  let rev = base_revenue;

  for (let i = 0; i < 5; i++) {
    const growthRate = (revenue_growth_rates[i] ?? 0) / 100;
    const marginPct = operating_margins[i] ?? 20;
    const taxPct = tax_rates[i] ?? 21;
    const capexPct = capex_pct_revenues[i] ?? 5;

    rev *= 1 + growthRate;
    const operatingIncome = rev * (marginPct / 100);
    const taxes = operatingIncome * (taxPct / 100);
    const nopat = operatingIncome - taxes;
    const capex = rev * (capexPct / 100);
    const fcf = nopat - capex;
    const discountFactor = 1 / Math.pow(1 + waccDecimal, i + 1);
    const pvFcf = fcf * discountFactor;

    years.push({
      revenue: rev,
      revenue_growth: growthRate * 100,
      operating_income: operatingIncome,
      operating_margin: marginPct,
      taxes,
      tax_rate: taxPct,
      nopat,
      capex,
      capex_pct: capexPct,
      fcf,
      discount_factor: discountFactor,
      pv_fcf: pvFcf,
    });
  }

  // Terminal value (Gordon Growth Model)
  const lastFcf = years[4].fcf;
  const terminalFcf = lastFcf * (1 + termGrowthDecimal);
  const terminal_value =
    waccDecimal > termGrowthDecimal
      ? terminalFcf / (waccDecimal - termGrowthDecimal)
      : 0;
  const pv_terminal_value =
    terminal_value / Math.pow(1 + waccDecimal, 5);

  // Enterprise value
  const sumPvFcf = years.reduce((sum, y) => sum + y.pv_fcf, 0);
  const enterprise_value = sumPvFcf + pv_terminal_value;

  const implied_share_price =
    shares_outstanding > 0 ? enterprise_value / shares_outstanding : 0;
  const upside_pct =
    currentPrice > 0
      ? ((implied_share_price - currentPrice) / currentPrice) * 100
      : 0;

  return {
    years,
    projected_revenues: years.map((y) => y.revenue),
    projected_fcfs: years.map((y) => y.fcf),
    terminal_value,
    pv_terminal_value,
    enterprise_value,
    implied_share_price,
    current_price: currentPrice,
    upside_pct,
  };
}
