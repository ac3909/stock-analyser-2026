import { ArrowUp, ArrowDown } from "lucide-react";
import type { KeyRatios, IndustryRatios } from "../../types/stock";

/** Whether a higher value is better, worse, or neither for this ratio. */
type Direction = "higher_better" | "lower_better" | "neutral";

interface RatioItem {
  label: string;
  value: number | null;
  industryValue: number | null;
  format: (v: number) => string;
  direction: Direction;
}

/** Format as a simple number with 2 decimal places. */
const fmtNum = (v: number) => v.toFixed(2);

/** Format as a percentage (value is a 0–1 fraction). */
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Format as a ratio with an "x" suffix. */
const fmtX = (v: number) => `${v.toFixed(2)}x`;

/** Format a value that yfinance already returns as a percentage. */
const fmtRawPct = (v: number) => `${v.toFixed(2)}%`;

interface RatioGroup {
  title: string;
  items: RatioItem[];
}

/** Build the three ratio groups from raw KeyRatios + optional industry data. */
function buildGroups(ratios: KeyRatios, industry: IndustryRatios | null): RatioGroup[] {
  const ind = industry;
  return [
    {
      title: "Valuation",
      items: [
        { label: "P/E Ratio", value: ratios.pe_ratio, industryValue: ind?.pe_ratio ?? null, format: fmtNum, direction: "lower_better" },
        { label: "Forward P/E", value: ratios.forward_pe, industryValue: ind?.forward_pe ?? null, format: fmtNum, direction: "lower_better" },
        { label: "PEG Ratio", value: ratios.peg_ratio, industryValue: ind?.peg_ratio ?? null, format: fmtNum, direction: "lower_better" },
        { label: "Price / Book", value: ratios.price_to_book, industryValue: ind?.price_to_book ?? null, format: fmtNum, direction: "lower_better" },
        { label: "Price / Sales", value: ratios.price_to_sales, industryValue: ind?.price_to_sales ?? null, format: fmtNum, direction: "lower_better" },
        { label: "EV / EBITDA", value: ratios.ev_to_ebitda, industryValue: ind?.ev_to_ebitda ?? null, format: fmtNum, direction: "lower_better" },
      ],
    },
    {
      title: "Profitability",
      items: [
        { label: "Profit Margin", value: ratios.profit_margin, industryValue: ind?.profit_margin ?? null, format: fmtPct, direction: "higher_better" },
        { label: "Operating Margin", value: ratios.operating_margin, industryValue: ind?.operating_margin ?? null, format: fmtPct, direction: "higher_better" },
        { label: "Return on Equity", value: ratios.return_on_equity, industryValue: ind?.return_on_equity ?? null, format: fmtPct, direction: "higher_better" },
        { label: "Return on Assets", value: ratios.return_on_assets, industryValue: ind?.return_on_assets ?? null, format: fmtPct, direction: "higher_better" },
        { label: "Dividend Yield", value: ratios.dividend_yield, industryValue: ind?.dividend_yield ?? null, format: fmtRawPct, direction: "neutral" },
      ],
    },
    {
      title: "Financial Health",
      items: [
        { label: "Debt / Equity", value: ratios.debt_to_equity, industryValue: ind?.debt_to_equity ?? null, format: fmtRawPct, direction: "lower_better" },
        { label: "Current Ratio", value: ratios.current_ratio, industryValue: ind?.current_ratio ?? null, format: fmtX, direction: "higher_better" },
        { label: "Quick Ratio", value: ratios.quick_ratio, industryValue: ind?.quick_ratio ?? null, format: fmtX, direction: "higher_better" },
        { label: "Beta", value: ratios.beta, industryValue: ind?.beta ?? null, format: fmtNum, direction: "neutral" },
      ],
    },
  ];
}

/** Compute the delta info between company and industry values. */
function getDelta(
  value: number,
  industryValue: number | null,
  direction: Direction,
): { diff: number; isUp: boolean; isGood: boolean } | null {
  if (industryValue == null || direction === "neutral") return null;
  const diff = value - industryValue;
  const isUp = diff > 0;
  const isGood = direction === "higher_better" ? isUp : !isUp;
  return { diff: Math.abs(diff), isUp, isGood };
}

interface Props {
  ratios: KeyRatios;
  industryRatios: IndustryRatios | null;
}

/** Three side-by-side columns showing company vs industry ratios with delta indicators. */
export default function RatiosCard({ ratios, industryRatios }: Props) {
  const groups = buildGroups(ratios, industryRatios);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <div
          key={group.title}
          className="bg-surface rounded-2xl border border-border overflow-hidden"
        >
          {/* Group header */}
          <div className="px-3 py-2 bg-surface-alt border-b border-border">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {group.title}
            </h3>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-3 py-1.5 border-b border-border text-xs text-text-muted">
            <span>Metric</span>
            <span className="w-14 text-right">Company</span>
            <span className="w-16 text-center">Delta</span>
            <span className="w-14 text-right">Industry</span>
          </div>

          {/* Rows */}
          <div>
            {group.items.map((item, i) => {
              const available = item.value != null;
              const delta = available
                ? getDelta(item.value!, item.industryValue, item.direction)
                : null;
              return (
                <div
                  key={item.label}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-3 py-1.5 ${
                    i % 2 === 1 ? "bg-surface-alt/50" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-text-primary truncate">{item.label}</span>
                  <span className="w-14 text-right text-sm font-mono text-text-primary tabular-nums">
                    {available ? item.format(item.value!) : "—"}
                  </span>
                  <span className="w-16 text-center">
                    {delta != null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums ${
                          delta.isGood ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {delta.isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                        {item.format(delta.diff)}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </span>
                  <span className="w-14 text-right text-sm font-mono text-text-muted tabular-nums">
                    {item.industryValue != null ? item.format(item.industryValue) : "—"}
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
