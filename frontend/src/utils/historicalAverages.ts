import type { FinancialStatementResponse, CompanyAverages } from "../types/stock";

/**
 * Try to read a value from a statement's data, falling back through
 * a list of alternative field names (proxies).
 */
function getWithFallback(
  data: Record<string, number | null>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const val = data[key];
    if (val != null) return val;
  }
  return null;
}

/**
 * Compute the company's own historical averages from its financial statements.
 *
 * Calculates mean operating margin, effective tax rate, capex/revenue ratio,
 * and average YoY revenue growth across all available statement years.
 *
 * When a primary metric is unavailable, proxy fields are used:
 *   - Operating Income → EBIT → Gross Profit (less accurate but directional)
 *   - Capital Expenditure → Purchase Of PPE → Depreciation And Amortization
 *   - Tax Rate falls back to 21% statutory rate when no data exists
 *
 * No extra API calls needed — uses the data already fetched on StockPage.
 */
export function computeCompanyAverages(
  income: FinancialStatementResponse | null,
  cashFlow: FinancialStatementResponse | null
): CompanyAverages {
  const result: CompanyAverages = {
    operating_margin: null,
    tax_rate: null,
    capex_pct_revenue: null,
    revenue_growth: null,
  };

  if (!income || income.statements.length === 0) return result;

  const stmts = income.statements;
  const cfStmts = cashFlow?.statements ?? [];

  const margins: number[] = [];
  const taxRates: number[] = [];
  const capexPcts: number[] = [];
  const growths: number[] = [];

  for (let i = 0; i < stmts.length; i++) {
    const data = stmts[i].data;
    const revenue = getWithFallback(data, "Total Revenue", "Revenue");

    if (revenue == null || revenue === 0) continue;

    // Operating margin: prefer Operating Income, fall back to EBIT, then Gross Profit
    const opIncome = getWithFallback(data, "Operating Income", "EBIT", "Gross Profit");
    if (opIncome != null) {
      margins.push((opIncome / revenue) * 100);
    }

    // Tax rate: prefer actual effective rate, fall back to 21% statutory
    const taxProvision = getWithFallback(data, "Tax Provision", "Income Tax Expense");
    const pretaxIncome = getWithFallback(data, "Pretax Income", "Income Before Tax");
    if (taxProvision != null && pretaxIncome != null && pretaxIncome !== 0) {
      taxRates.push((taxProvision / pretaxIncome) * 100);
    }

    // Capex from matching cash flow statement
    if (i < cfStmts.length) {
      const cfData = cfStmts[i].data;
      const capex = getWithFallback(
        cfData,
        "Capital Expenditure",
        "Purchase Of PPE",
        "Depreciation And Amortization"
      );
      if (capex != null) {
        capexPcts.push((Math.abs(capex) / revenue) * 100);
      }
    }

    // Revenue growth (comparing to next statement which is the prior year)
    if (i + 1 < stmts.length) {
      const prevRevenue = getWithFallback(
        stmts[i + 1].data,
        "Total Revenue",
        "Revenue"
      );
      if (prevRevenue != null && prevRevenue !== 0) {
        growths.push(((revenue - prevRevenue) / Math.abs(prevRevenue)) * 100);
      }
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : null;

  result.operating_margin = avg(margins);
  result.tax_rate = avg(taxRates) ?? 21; // statutory fallback
  result.capex_pct_revenue = avg(capexPcts);
  result.revenue_growth = avg(growths);

  return result;
}
