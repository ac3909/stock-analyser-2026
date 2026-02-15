import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MultiplesInputs, MultiplesResults } from "../../types/stock";
import { calculateMultiples } from "../../utils/multiples";

const MULTIPLE_OPTIONS = [
  { value: "pe" as const, label: "P/E (Price-to-Earnings)" },
  { value: "ev_revenue" as const, label: "EV/Revenue" },
  { value: "ev_ebitda" as const, label: "EV/EBITDA" },
];

const METRIC_LABELS: Record<MultiplesInputs["multiple_type"], string> = {
  pe: "Projected EPS ($)",
  ev_revenue: "Projected Revenue ($)",
  ev_ebitda: "Projected EBITDA ($)",
};

interface Props {
  defaults: MultiplesInputs;
  currentPrice: number;
}

/** Format large numbers for display in input hints. */
function fmtHint(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(2)}`;
}

/** Format large numbers with B/M/K suffixes. */
function fmtVal(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Multiples-based valuation input form with inline results. */
export default function MultiplesModel({ defaults, currentPrice }: Props) {
  const [inputs, setInputs] = useState<MultiplesInputs>(defaults);

  const update = <K extends keyof MultiplesInputs>(
    key: K,
    value: MultiplesInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const results: MultiplesResults = useMemo(
    () => calculateMultiples(inputs, currentPrice),
    [inputs, currentPrice]
  );

  const isUp = results.upside_pct >= 0;
  const UpsideIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Assumptions
        </h4>

        {/* Multiple type selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Valuation Multiple
          </label>
          <select
            value={inputs.multiple_type}
            onChange={(e) =>
              update(
                "multiple_type",
                e.target.value as MultiplesInputs["multiple_type"]
              )
            }
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MULTIPLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Metric value and target multiple */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {METRIC_LABELS[inputs.multiple_type]}
            </label>
            <input
              type="number"
              value={inputs.projected_metric_value}
              onChange={(e) =>
                update(
                  "projected_metric_value",
                  parseFloat(e.target.value) || 0
                )
              }
              step={inputs.multiple_type === "pe" ? 0.1 : 1000000}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {inputs.multiple_type !== "pe" && (
              <p className="text-xs text-gray-400 mt-1">
                = {fmtHint(inputs.projected_metric_value)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Target Multiple
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inputs.target_multiple}
                onChange={(e) =>
                  update("target_multiple", parseFloat(e.target.value) || 0)
                }
                step={0.5}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400 shrink-0">x</span>
            </div>
          </div>
        </div>

        {/* Net debt and shares (for EV-based) */}
        {inputs.multiple_type !== "pe" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Net Debt ($)
              </label>
              <input
                type="number"
                value={inputs.net_debt}
                onChange={(e) =>
                  update("net_debt", parseFloat(e.target.value) || 0)
                }
                step={1000000}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                = {fmtHint(inputs.net_debt)}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Shares Outstanding
              </label>
              <input
                type="number"
                value={inputs.shares_outstanding}
                onChange={(e) =>
                  update(
                    "shares_outstanding",
                    parseFloat(e.target.value) || 0
                  )
                }
                step={1000000}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Inline results */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Valuation Result
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">Implied Equity Value</p>
            <p className="text-sm font-semibold text-gray-900">
              {fmtVal(results.implied_value)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Implied Share Price</p>
            <p className="text-3xl font-bold text-gray-900">
              ${results.implied_share_price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Current Price</p>
            <p className="text-xl font-semibold text-gray-500">
              ${results.current_price.toFixed(2)}
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            <UpsideIcon size={16} />
            {isUp ? "+" : ""}
            {results.upside_pct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export { type Props as MultiplesModelProps };
