import type { KeyRatios } from "../../types/stock";

/** Format a ratio value for table display. */
function fmtVal(value: number | null, key: string): string {
  if (value == null) return "—";
  const pctKeys = ["profit_margin", "operating_margin", "return_on_equity", "return_on_assets"];
  const rawPctKeys = ["dividend_yield", "debt_to_equity"];
  if (pctKeys.includes(key)) return `${(value * 100).toFixed(1)}%`;
  if (rawPctKeys.includes(key)) return `${value.toFixed(2)}%`;
  if (key === "current_ratio" || key === "quick_ratio") return `${value.toFixed(2)}x`;
  return value.toFixed(2);
}

/** Human-readable labels for ratio keys. */
const LABELS: Record<string, string> = {
  pe_ratio: "P/E Ratio",
  forward_pe: "Forward P/E",
  peg_ratio: "PEG Ratio",
  price_to_book: "Price / Book",
  price_to_sales: "Price / Sales",
  ev_to_ebitda: "EV / EBITDA",
  profit_margin: "Profit Margin",
  operating_margin: "Operating Margin",
  return_on_equity: "Return on Equity",
  return_on_assets: "Return on Assets",
  debt_to_equity: "Debt / Equity",
  current_ratio: "Current Ratio",
  quick_ratio: "Quick Ratio",
  dividend_yield: "Dividend Yield",
  beta: "Beta",
};

const GROUPS = [
  {
    title: "Valuation",
    keys: ["pe_ratio", "forward_pe", "peg_ratio", "price_to_book", "price_to_sales", "ev_to_ebitda"],
  },
  {
    title: "Profitability",
    keys: ["profit_margin", "operating_margin", "return_on_equity", "return_on_assets"],
  },
  {
    title: "Financial Health",
    keys: ["debt_to_equity", "current_ratio", "quick_ratio", "dividend_yield", "beta"],
  },
];

interface Props {
  subject: KeyRatios;
  comps: KeyRatios[];
  averages: Record<string, number | null>;
}

/** Side-by-side ratio comparison table. */
export default function CompsTable({ subject, comps, averages }: Props) {
  const allSymbols = [subject.symbol, ...comps.map((c) => c.symbol)];
  const allRatios = [subject, ...comps];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-white z-10 min-w-[140px]">
                Metric
              </th>
              {allSymbols.map((sym, i) => (
                <th
                  key={sym}
                  className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[90px] ${
                    i === 0
                      ? "text-blue-600 bg-blue-50/50"
                      : "text-gray-500"
                  }`}
                >
                  {sym}
                </th>
              ))}
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[90px]">
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <>
                <tr key={group.title}>
                  <td
                    colSpan={allSymbols.length + 2}
                    className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.keys.map((key, rowIdx) => {
                  const avg = averages[key];
                  return (
                    <tr
                      key={key}
                      className={rowIdx % 2 === 1 ? "bg-gray-50/30" : ""}
                    >
                      <td className="px-4 py-2 text-gray-700 font-medium sticky left-0 bg-inherit z-10">
                        {LABELS[key] ?? key}
                      </td>
                      {allRatios.map((r, i) => {
                        const val = r[key as keyof KeyRatios] as
                          | number
                          | null;
                        const isSubject = i === 0;
                        // Highlight if subject is better than average
                        let highlight = "";
                        if (isSubject && val != null && avg != null) {
                          // For most metrics, lower is better (valuation, debt)
                          // For margins/returns, higher is better
                          const higherIsBetter = [
                            "profit_margin",
                            "operating_margin",
                            "return_on_equity",
                            "return_on_assets",
                            "current_ratio",
                            "quick_ratio",
                          ].includes(key);
                          const isBetter = higherIsBetter
                            ? val > avg
                            : val < avg;
                          highlight = isBetter
                            ? "text-emerald-600"
                            : "text-red-600";
                        }
                        return (
                          <td
                            key={r.symbol}
                            className={`text-right px-4 py-2 tabular-nums ${
                              isSubject
                                ? `font-semibold bg-blue-50/30 ${highlight}`
                                : "text-gray-600"
                            }`}
                          >
                            {fmtVal(val, key)}
                          </td>
                        );
                      })}
                      <td className="text-right px-4 py-2 text-gray-400 tabular-nums">
                        {fmtVal(avg, key)}
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
