import type { KeyRatios } from "../../types/stock";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/** Key metrics to highlight in the summary. */
const HIGHLIGHTS: {
  key: keyof KeyRatios;
  label: string;
  higherIsBetter: boolean;
  format: (v: number) => string;
}[] = [
  {
    key: "pe_ratio",
    label: "P/E Ratio",
    higherIsBetter: false,
    format: (v) => v.toFixed(1),
  },
  {
    key: "ev_to_ebitda",
    label: "EV/EBITDA",
    higherIsBetter: false,
    format: (v) => v.toFixed(1),
  },
  {
    key: "profit_margin",
    label: "Profit Margin",
    higherIsBetter: true,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "return_on_equity",
    label: "ROE",
    higherIsBetter: true,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "debt_to_equity",
    label: "Debt/Equity",
    higherIsBetter: false,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "current_ratio",
    label: "Current Ratio",
    higherIsBetter: true,
    format: (v) => `${v.toFixed(2)}x`,
  },
];

interface Props {
  subject: KeyRatios;
  averages: Record<string, number | null>;
}

/** Card-based summary showing subject vs peer average for key metrics. */
export default function CompsSummary({ subject, averages }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {HIGHLIGHTS.map(({ key, label, higherIsBetter, format }) => {
        const subjectVal = subject[key] as number | null;
        const avgVal = averages[key];

        if (subjectVal == null || avgVal == null || avgVal === 0) {
          return (
            <div
              key={key}
              className="bg-surface rounded-xl border border-border px-4 py-3"
            >
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <p className="text-xs text-text-muted">Insufficient data</p>
            </div>
          );
        }

        const diffPct = ((subjectVal - avgVal) / Math.abs(avgVal)) * 100;
        const isBetter = higherIsBetter ? diffPct > 0 : diffPct < 0;
        const isNeutral = Math.abs(diffPct) < 5;

        const Icon = isNeutral ? Minus : isBetter ? TrendingUp : TrendingDown;
        const colorClass = isNeutral
          ? "text-text-secondary bg-surface-alt"
          : isBetter
            ? "text-emerald-600 bg-positive-subtle"
            : "text-red-600 bg-negative-subtle";

        const direction =
          diffPct > 0 ? "above" : diffPct < 0 ? "below" : "at";

        return (
          <div
            key={key}
            className="bg-surface rounded-xl border border-border px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${colorClass}`}
              >
                <Icon size={12} />
                {Math.abs(diffPct).toFixed(0)}% {direction}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">
                {format(subjectVal)}
              </span>{" "}
              vs avg{" "}
              <span className="font-medium">{format(avgVal)}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
