import type { KeyRatios } from "../../types/stock";

type Health = "green" | "amber" | "red" | "neutral";

interface RatioItem {
  label: string;
  description: string;
  value: number | null;
  format: (v: number) => string;
  health: (v: number) => Health;
}

/** Format as a simple number with 2 decimal places. */
const fmtNum = (v: number) => v.toFixed(2);

/** Format as a percentage. */
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Format as a ratio with an "x" suffix. */
const fmtX = (v: number) => `${v.toFixed(2)}x`;

/** Format a value that yfinance already returns as a percentage. */
const fmtRawPct = (v: number) => `${v.toFixed(2)}%`;

/** No health colouring — always neutral. */
const neutral = () => "neutral" as const;

interface RatioGroup {
  title: string;
  items: RatioItem[];
}

/** Build the three ratio groups from raw KeyRatios data. */
function buildGroups(ratios: KeyRatios): RatioGroup[] {
  return [
    {
      title: "Valuation",
      items: [
        {
          label: "P/E Ratio",
          description: "Price relative to earnings",
          value: ratios.pe_ratio,
          format: fmtNum,
          health: (v) => (v < 0 ? "red" : v <= 25 ? "green" : v <= 40 ? "amber" : "red"),
        },
        {
          label: "Forward P/E",
          description: "Expected price to earnings",
          value: ratios.forward_pe,
          format: fmtNum,
          health: (v) => (v < 0 ? "red" : v <= 25 ? "green" : v <= 40 ? "amber" : "red"),
        },
        {
          label: "PEG Ratio",
          description: "P/E relative to growth",
          value: ratios.peg_ratio,
          format: fmtNum,
          health: (v) => (v < 0 ? "red" : v <= 1.5 ? "green" : v <= 2.5 ? "amber" : "red"),
        },
        {
          label: "Price / Book",
          description: "Price relative to book value",
          value: ratios.price_to_book,
          format: fmtNum,
          health: (v) => (v <= 3 ? "green" : v <= 5 ? "amber" : "red"),
        },
        {
          label: "Price / Sales",
          description: "Price relative to revenue",
          value: ratios.price_to_sales,
          format: fmtNum,
          health: (v) => (v <= 5 ? "green" : v <= 10 ? "amber" : "red"),
        },
        {
          label: "EV / EBITDA",
          description: "Enterprise value to EBITDA",
          value: ratios.ev_to_ebitda,
          format: fmtNum,
          health: (v) => (v <= 15 ? "green" : v <= 25 ? "amber" : "red"),
        },
      ],
    },
    {
      title: "Profitability",
      items: [
        {
          label: "Profit Margin",
          description: "Net income as % of revenue",
          value: ratios.profit_margin,
          format: fmtPct,
          health: (v) => (v >= 0.15 ? "green" : v >= 0.05 ? "amber" : "red"),
        },
        {
          label: "Operating Margin",
          description: "Operating income as % of revenue",
          value: ratios.operating_margin,
          format: fmtPct,
          health: (v) => (v >= 0.15 ? "green" : v >= 0.05 ? "amber" : "red"),
        },
        {
          label: "Return on Equity",
          description: "Profit generated per equity dollar",
          value: ratios.return_on_equity,
          format: fmtPct,
          health: (v) => (v >= 0.15 ? "green" : v >= 0.08 ? "amber" : "red"),
        },
        {
          label: "Return on Assets",
          description: "Profit generated per asset dollar",
          value: ratios.return_on_assets,
          format: fmtPct,
          health: (v) => (v >= 0.05 ? "green" : v >= 0.02 ? "amber" : "red"),
        },
        {
          label: "Dividend Yield",
          description: "Annual dividends as % of price",
          value: ratios.dividend_yield,
          format: fmtRawPct,
          health: neutral,
        },
      ],
    },
    {
      title: "Financial Health",
      items: [
        {
          label: "Debt / Equity",
          description: "Total debt relative to equity",
          value: ratios.debt_to_equity,
          format: fmtRawPct,
          health: (v) => (v <= 100 ? "green" : v <= 200 ? "amber" : "red"),
        },
        {
          label: "Current Ratio",
          description: "Ability to pay short-term debts",
          value: ratios.current_ratio,
          format: fmtX,
          health: (v) => (v >= 1.5 ? "green" : v >= 1 ? "amber" : "red"),
        },
        {
          label: "Quick Ratio",
          description: "Liquid assets vs short-term debts",
          value: ratios.quick_ratio,
          format: fmtX,
          health: (v) => (v >= 1 ? "green" : v >= 0.5 ? "amber" : "red"),
        },
        {
          label: "Beta",
          description: "Volatility relative to market",
          value: ratios.beta,
          format: fmtNum,
          health: neutral,
        },
      ],
    },
  ];
}

const HEALTH_STYLES: Record<Health, string> = {
  green: "text-emerald-600 bg-emerald-50",
  amber: "text-amber-600 bg-amber-50",
  red: "text-red-600 bg-red-50",
  neutral: "text-gray-900 bg-gray-50",
};

interface Props {
  ratios: KeyRatios;
}

/** Grid of colour-coded financial ratio cards grouped by category. */
export default function RatiosCard({ ratios }: Props) {
  const groups = buildGroups(ratios);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => {
              const available = item.value != null;
              const health = available ? item.health(item.value!) : "neutral";
              const style = HEALTH_STYLES[health];
              return (
                <div
                  key={item.label}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold px-2.5 py-1 rounded-lg ${style}`}
                  >
                    {available ? item.format(item.value!) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
