import { useState, useMemo } from "react";
import type { FinancialStatement } from "../../types/stock";
import { unitSuffixFromDivisor } from "../../utils/format";

export type StatementType = "income_statement" | "balance_sheet" | "cash_flow";

/** A section header row (no data, just a label). */
type SectionHeader = { section: string };
/** A data row: [displayLabel, yfinanceFieldKey]. */
type DataRow = [string, string];
type RowEntry = SectionHeader | DataRow;

function isSectionHeader(entry: RowEntry): entry is SectionHeader {
  return !Array.isArray(entry);
}

/**
 * Standardised row order for each financial statement.
 * Only these rows are shown, in exactly this order.
 * Section headers group related line items visually.
 */
const INCOME_STATEMENT_ROWS: RowEntry[] = [
  { section: "Revenue" },
  ["Total Revenue", "Total Revenue"],
  ["Cost Of Revenue", "Cost Of Revenue"],
  ["Gross Profit", "Gross Profit"],
  { section: "Operating Expenses" },
  ["Operating Expense", "Operating Expense"],
  ["Selling General And Administration", "Selling General And Administration"],
  ["Research And Development", "Research And Development"],
  ["Operating Income", "Operating Income"],
  { section: "Interest & Other Income" },
  ["Interest Expense", "Interest Expense"],
  ["Interest Income", "Interest Income"],
  ["Other Non-Operating Income/Expenses", "Other Non Operating Income Expenses"],
  { section: "Tax & Net Income" },
  ["Pretax Income", "Pretax Income"],
  ["Tax Provision", "Tax Provision"],
  ["Net Income", "Net Income"],
  { section: "Per Share & EBITDA" },
  ["Basic EPS", "Basic EPS"],
  ["Diluted EPS", "Diluted EPS"],
  ["Basic Shares Outstanding", "Basic Average Shares"],
  ["Diluted Shares Outstanding", "Diluted Average Shares"],
  ["EBITDA", "EBITDA"],
  ["EBIT", "EBIT"],
];

const BALANCE_SHEET_ROWS: RowEntry[] = [
  { section: "Assets" },
  ["Cash And Cash Equivalents", "Cash And Cash Equivalents"],
  ["Other Short-Term Investments", "Other Short Term Investments"],
  ["Cash, Cash Equivalents And Short-Term Investments", "Cash Cash Equivalents And Short Term Investments"],
  ["Accounts Receivable", "Accounts Receivable"],
  ["Inventory", "Inventory"],
  ["Other Current Assets", "Other Current Assets"],
  ["Total Current Assets", "Current Assets"],
  ["Net PPE", "Net PPE"],
  ["Goodwill", "Goodwill"],
  ["Other Intangible Assets", "Other Intangible Assets"],
  ["Investments And Advances", "Investments And Advances"],
  ["Other Non-Current Assets", "Other Non Current Assets"],
  ["Total Non-Current Assets", "Total Non Current Assets"],
  ["Total Assets", "Total Assets"],
  { section: "Liabilities" },
  ["Accounts Payable", "Accounts Payable"],
  ["Current Debt", "Current Debt"],
  ["Current Deferred Revenue", "Current Deferred Revenue"],
  ["Other Current Liabilities", "Other Current Liabilities"],
  ["Total Current Liabilities", "Current Liabilities"],
  ["Long-Term Debt", "Long Term Debt"],
  ["Long-Term Deferred Revenue", "Long Term Debt And Capital Lease Obligation"],
  ["Other Non-Current Liabilities", "Other Non Current Liabilities"],
  ["Total Non-Current Liabilities", "Total Non Current Liabilities Net Minority Interest"],
  ["Total Liabilities", "Total Liabilities Net Minority Interest"],
  { section: "Equity" },
  ["Common Stock", "Common Stock"],
  ["Retained Earnings", "Retained Earnings"],
  ["Other Stockholder Equity", "Gains Losses Not Affecting Retained Earnings"],
  ["Total Stockholders' Equity", "Stockholders Equity"],
  ["Total Liabilities And Equity", "Total Equity Gross Minority Interest"],
];

const CASH_FLOW_ROWS: RowEntry[] = [
  { section: "Operating Activities" },
  ["Net Income", "Net Income From Continuing Operations"],
  ["Depreciation And Amortisation", "Depreciation And Amortization"],
  ["Stock-Based Compensation", "Stock Based Compensation"],
  ["Deferred Income Tax", "Deferred Income Tax"],
  ["Change In Working Capital", "Change In Working Capital"],
  ["Accounts Receivable", "Change In Receivables"],
  ["Inventory", "Change In Inventory"],
  ["Accounts Payable", "Change In Payables And Accrued Expense"],
  ["Other Operating Activities", "Change In Other Operating Activities"],
  ["Operating Cash Flow", "Operating Cash Flow"],
  { section: "Investing Activities" },
  ["Capital Expenditure", "Capital Expenditure"],
  ["Net Business Acquisitions", "Net Business Purchase And Sale"],
  ["Net Investment Purchases", "Net Investment Purchase And Sale"],
  ["Other Investing Activities", "Net Other Investing Changes"],
  ["Investing Cash Flow", "Investing Cash Flow"],
  { section: "Financing Activities" },
  ["Debt Issuance/Repayment", "Net Issuance Payments Of Debt"],
  ["Common Stock Issuance/Repurchase", "Net Common Stock Issuance"],
  ["Dividends Paid", "Common Stock Dividend Paid"],
  ["Other Financing Activities", "Net Other Financing Charges"],
  ["Financing Cash Flow", "Financing Cash Flow"],
  { section: "Summary" },
  ["Net Change In Cash", "Changes In Cash"],
  ["Free Cash Flow", "Free Cash Flow"],
];

const STATEMENT_ROWS: Record<StatementType, RowEntry[]> = {
  income_statement: INCOME_STATEMENT_ROWS,
  balance_sheet: BALANCE_SHEET_ROWS,
  cash_flow: CASH_FLOW_ROWS,
};

const UNIT_OPTIONS = [
  { label: "Auto", divisor: 0 },
  { label: "Thousands", divisor: 1e3 },
  { label: "Millions", divisor: 1e6 },
  { label: "Billions", divisor: 1e9 },
  { label: "Trillions", divisor: 1e12 },
] as const;

/**
 * Detect the best uniform unit for all values in the table.
 * Looks at the largest absolute value across all statements and picks a unit
 * so that the biggest number reads as a reasonable figure (e.g. 394.33B not 394328000000).
 */
function detectUniformUnit(statements: FinancialStatement[]): number {
  let maxAbs = 0;
  for (const stmt of statements) {
    for (const val of Object.values(stmt.data)) {
      if (val != null) {
        const abs = Math.abs(val);
        if (abs > maxAbs) maxAbs = abs;
      }
    }
  }
  if (maxAbs >= 1e12) return 1e12;
  if (maxAbs >= 1e9) return 1e9;
  if (maxAbs >= 1e6) return 1e6;
  if (maxAbs >= 1e3) return 1e3;
  return 1;
}

/** Format a value using the given divisor. Negatives use accounting brackets. */
function formatValue(value: number | null, divisor: number): string {
  if (value == null) return "—";
  const isNeg = value < 0;
  const abs = Math.abs(value);
  let formatted: string;
  if (divisor <= 1) {
    formatted = abs.toFixed(2);
  } else {
    formatted = (abs / divisor).toFixed(2);
  }
  return isNeg ? `(${formatted})` : formatted;
}

/** Compute YoY % change. Statements are newest-first, so the prior year is at index + 1. */
function computeYoY(
  statements: FinancialStatement[],
  colIndex: number,
  fieldKey: string,
): number | null {
  const current = statements[colIndex]?.data[fieldKey];
  const prior = statements[colIndex + 1]?.data[fieldKey];
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

/** Format a YoY value as a short percentage string. */
function formatYoY(yoy: number): string {
  const sign = yoy >= 0 ? "+" : "";
  return `${sign}${yoy.toFixed(1)}%`;
}

/** Format a date string to just the year. */
function formatYear(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

/**
 * Return the ordered list of row entries for the given statement type,
 * filtered to only include data rows that have values in at least one period.
 * Section headers are kept only if they have at least one visible data row after them.
 */
function getOrderedRows(
  statements: FinancialStatement[],
  statementType: StatementType,
): RowEntry[] {
  const allRows = STATEMENT_ROWS[statementType];
  const result: RowEntry[] = [];
  let pendingHeader: SectionHeader | null = null;

  for (const entry of allRows) {
    if (isSectionHeader(entry)) {
      pendingHeader = entry;
    } else {
      const [, fieldKey] = entry;
      const hasData = statements.some((stmt) => stmt.data[fieldKey] != null);
      if (hasData) {
        if (pendingHeader) {
          result.push(pendingHeader);
          pendingHeader = null;
        }
        result.push(entry);
      }
    }
  }
  return result;
}

interface Props {
  statements: FinancialStatement[];
  statementType: StatementType;
}

/** Tabular view of financial statements — years as columns, metrics as rows. */
export default function FinancialTable({ statements, statementType }: Props) {
  const [unitDivisor, setUnitDivisor] = useState(0);

  const autoUnit = useMemo(() => detectUniformUnit(statements), [statements]);
  const activeDivisor = unitDivisor === 0 ? autoUnit : unitDivisor;
  const activeSuffix = unitSuffixFromDivisor(activeDivisor);

  if (statements.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center text-sm text-text-muted">
        No financial data available
      </div>
    );
  }

  const rows = getOrderedRows(statements, statementType);
  // Each year gets 2 columns: value + YoY
  const totalCols = 1 + statements.length * 2;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden select-none cursor-default">
      {/* Unit selector */}
      <div className="flex items-center justify-end gap-2 px-5 py-2 border-b border-border">
        <label className="text-xs text-text-muted">Display units:</label>
        <select
          value={unitDivisor}
          onChange={(e) => setUnitDivisor(Number(e.target.value))}
          className="bg-surface-alt border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
        >
          {UNIT_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.divisor}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide bg-surface-alt sticky left-0 z-10 min-w-[200px]">
                Metric{activeSuffix ? ` (${activeSuffix})` : ""}
              </th>
              {statements.map((stmt) => (
                <th
                  key={stmt.date}
                  colSpan={2}
                  className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide bg-surface-alt min-w-[140px]"
                >
                  {formatYear(stmt.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, i) => {
              if (isSectionHeader(entry)) {
                return (
                  <tr key={entry.section} className="border-b border-border">
                    <td
                      colSpan={totalCols}
                      className="px-5 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide bg-surface-alt sticky left-0"
                    >
                      {entry.section}
                    </td>
                  </tr>
                );
              }
              const [label, fieldKey] = entry;
              const nextEntry = rows[i + 1];
              const isSectionTotal = !nextEntry || isSectionHeader(nextEntry);
              return (
                <tr
                  key={fieldKey}
                  className={`${isSectionTotal ? "border-b-2 border-border" : "border-b border-border/50"} ${i % 2 === 1 ? "bg-surface-alt/50" : ""}`}
                >
                  <td className={`px-5 py-2.5 text-text-primary sticky left-0 bg-inherit whitespace-nowrap ${isSectionTotal ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </td>
                  {statements.map((stmt, colIdx) => {
                    const val = stmt.data[fieldKey] ?? null;
                    const yoy = computeYoY(statements, colIdx, fieldKey);
                    return (
                      <>
                        <td
                          key={`${stmt.date}-val`}
                          className={`pl-5 pr-1 py-2.5 text-right whitespace-nowrap tabular-nums font-mono text-text-primary ${isSectionTotal ? "font-semibold" : "font-medium"}`}
                        >
                          {formatValue(val, activeDivisor)}
                        </td>
                        <td
                          key={`${stmt.date}-yoy`}
                          className="pr-5 pl-1 py-2.5 text-left whitespace-nowrap w-[60px]"
                        >
                          {yoy != null ? (
                            <span
                              className={`text-xs tabular-nums font-mono ${
                                yoy >= 0 ? "text-emerald-500" : "text-red-400"
                              }`}
                            >
                              {formatYoY(yoy)}
                            </span>
                          ) : null}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
