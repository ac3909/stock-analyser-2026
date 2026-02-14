import type { FinancialStatement } from "../../types/stock";

/** Format a large number with appropriate unit suffix (B, M, K). */
function formatValue(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  let formatted: string;
  if (abs >= 1e9) {
    formatted = `${(value / 1e9).toFixed(2)}B`;
  } else if (abs >= 1e6) {
    formatted = `${(value / 1e6).toFixed(2)}M`;
  } else if (abs >= 1e3) {
    formatted = `${(value / 1e3).toFixed(1)}K`;
  } else {
    formatted = value.toFixed(2);
  }
  return formatted;
}

/** Format a date string to just the year. */
function formatYear(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

/** Collect every unique metric name across all statements, preserving order. */
function collectMetrics(statements: FinancialStatement[]): string[] {
  const seen = new Set<string>();
  const metrics: string[] = [];
  for (const stmt of statements) {
    for (const key of Object.keys(stmt.data)) {
      if (!seen.has(key)) {
        seen.add(key);
        metrics.push(key);
      }
    }
  }
  return metrics;
}

interface Props {
  statements: FinancialStatement[];
}

/** Tabular view of financial statements — years as columns, metrics as rows. */
export default function FinancialTable({ statements }: Props) {
  if (statements.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No financial data available
      </div>
    );
  }

  const metrics = collectMetrics(statements);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                Metric
              </th>
              {statements.map((stmt) => (
                <th
                  key={stmt.date}
                  className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 min-w-[110px]"
                >
                  {formatYear(stmt.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, i) => (
              <tr
                key={metric}
                className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}
              >
                <td className="px-5 py-2.5 text-gray-700 font-medium sticky left-0 bg-inherit whitespace-nowrap">
                  {metric}
                </td>
                {statements.map((stmt) => {
                  const val = stmt.data[metric] ?? null;
                  const isNegative = val != null && val < 0;
                  return (
                    <td
                      key={stmt.date}
                      className={`px-5 py-2.5 text-right tabular-nums whitespace-nowrap ${
                        isNegative ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {formatValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
