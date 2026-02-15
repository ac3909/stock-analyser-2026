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
              className="bg-white rounded-xl border border-gray-200 px-4 py-3"
            >
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-400">Insufficient data</p>
            </div>
          );
        }

        const diffPct = ((subjectVal - avgVal) / Math.abs(avgVal)) * 100;
        const isBetter = higherIsBetter ? diffPct > 0 : diffPct < 0;
        const isNeutral = Math.abs(diffPct) < 5;

        const Icon = isNeutral ? Minus : isBetter ? TrendingUp : TrendingDown;
        const colorClass = isNeutral
          ? "text-gray-500 bg-gray-50"
          : isBetter
            ? "text-emerald-600 bg-emerald-50"
            : "text-red-600 bg-red-50";

        const direction =
          diffPct > 0 ? "above" : diffPct < 0 ? "below" : "at";

        return (
          <div
            key={key}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${colorClass}`}
              >
                <Icon size={12} />
                {Math.abs(diffPct).toFixed(0)}% {direction}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
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
