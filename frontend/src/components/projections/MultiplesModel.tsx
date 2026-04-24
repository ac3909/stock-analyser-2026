import { useState, useMemo } from "react";
import type { MultiplesInputs, MultiplesResults } from "../../types/stock";
import { calculateMultiples } from "../../utils/multiples";
import { fmtValFull } from "../../utils/format";

const MULTIPLE_OPTIONS = [
  { value: "pe" as const, label: "P/E (Price-to-Earnings)" },
  { value: "ev_revenue" as const, label: "EV/Revenue" },
  { value: "ev_ebitda" as const, label: "EV/EBITDA" },
];

const METRIC_LABELS: Record<MultiplesInputs["multiple_type"], string> = {
  pe: "Projected EPS",
  ev_revenue: "Projected Revenue",
  ev_ebitda: "Projected EBITDA",
};

const UNIT_OPTIONS = [
  { label: "Million", multiplier: 1e6 },
  { label: "Billion", multiplier: 1e9 },
  { label: "Trillion", multiplier: 1e12 },
];

/** Detect the best initial unit for a raw value. */
function detectUnit(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1e12) return 1e12;
  if (abs >= 1e9) return 1e9;
  return 1e6;
}

interface Props {
  defaults: MultiplesInputs;
  currentPrice: number;
}

/** Multiples-based valuation with inputs on the left and results on the right. */
export default function MultiplesModel({ defaults, currentPrice }: Props) {
  const [inputs, setInputs] = useState<MultiplesInputs>(defaults);

  const [metricUnit, setMetricUnit] = useState(() => detectUnit(defaults.projected_metric_value));
  const [debtUnit, setDebtUnit] = useState(() => detectUnit(defaults.net_debt));
  const [sharesUnit, setSharesUnit] = useState(() => detectUnit(defaults.shares_outstanding));

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

  const innerInput =
    "flex-1 min-w-0 bg-transparent border-none px-3 py-1.5 text-sm text-right text-text-primary focus:outline-none";
  const innerSelect =
    "bg-transparent border-none pr-3 pl-1 py-1.5 text-sm text-text-secondary focus:outline-none cursor-pointer";
  const boxClass =
    "flex items-center w-40 bg-surface-alt border border-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500";

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Inputs */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Assumptions
          </h4>

          {/* Valuation Multiple */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">Valuation Multiple</span>
            <div className={boxClass}>
              <select
                value={inputs.multiple_type}
                onChange={(e) =>
                  update(
                    "multiple_type",
                    e.target.value as MultiplesInputs["multiple_type"]
                  )
                }
                className="w-full bg-transparent border-none px-3 py-1.5 text-sm text-right text-text-primary focus:outline-none cursor-pointer"
              >
                {MULTIPLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Projected metric */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">
              {METRIC_LABELS[inputs.multiple_type]}
            </span>
            {inputs.multiple_type === "pe" ? (
              <div className={boxClass}>
                <span className="pl-3 text-sm text-text-muted">$</span>
                <input
                  type="number"
                  value={inputs.projected_metric_value}
                  onChange={(e) =>
                    update("projected_metric_value", parseFloat(e.target.value) || 0)
                  }
                  step={0.1}
                  className={innerInput}
                />
              </div>
            ) : (
              <div className={boxClass}>
                <span className="pl-3 text-sm text-text-muted">$</span>
                <input
                  type="number"
                  value={parseFloat((inputs.projected_metric_value / metricUnit).toFixed(4))}
                  onChange={(e) =>
                    update("projected_metric_value", (parseFloat(e.target.value) || 0) * metricUnit)
                  }
                  step={1}
                  className={innerInput}
                />
                <select
                  value={metricUnit}
                  onChange={(e) => {
                    const newMul = Number(e.target.value);
                    const displayVal = inputs.projected_metric_value / metricUnit;
                    setMetricUnit(newMul);
                    update("projected_metric_value", displayVal * newMul);
                  }}
                  className={innerSelect}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.label} value={u.multiplier}>{u.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Target Multiple */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">Target Multiple</span>
            <div className={boxClass}>
              <input
                type="number"
                value={inputs.target_multiple}
                onChange={(e) =>
                  update("target_multiple", parseFloat(e.target.value) || 0)
                }
                step={0.5}
                className={innerInput}
              />
              <span className="pr-3 text-sm text-text-muted">x</span>
            </div>
          </div>

          {/* Net debt and shares (for EV-based) */}
          {inputs.multiple_type !== "pe" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-secondary">Net Debt</span>
                <div className={boxClass}>
                  <span className="pl-3 text-sm text-text-muted">$</span>
                  <input
                    type="number"
                    value={parseFloat((inputs.net_debt / debtUnit).toFixed(4))}
                    onChange={(e) =>
                      update("net_debt", (parseFloat(e.target.value) || 0) * debtUnit)
                    }
                    step={1}
                    className={innerInput}
                  />
                  <select
                    value={debtUnit}
                    onChange={(e) => {
                      const newMul = Number(e.target.value);
                      const displayVal = inputs.net_debt / debtUnit;
                      setDebtUnit(newMul);
                      update("net_debt", displayVal * newMul);
                    }}
                    className={innerSelect}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.label} value={u.multiplier}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-secondary">Shares Outstanding</span>
                <div className={boxClass}>
                  <input
                    type="number"
                    value={parseFloat((inputs.shares_outstanding / sharesUnit).toFixed(4))}
                    onChange={(e) =>
                      update("shares_outstanding", (parseFloat(e.target.value) || 0) * sharesUnit)
                    }
                    step={1}
                    className={innerInput}
                  />
                  <select
                    value={sharesUnit}
                    onChange={(e) => {
                      const newMul = Number(e.target.value);
                      const displayVal = inputs.shares_outstanding / sharesUnit;
                      setSharesUnit(newMul);
                      update("shares_outstanding", displayVal * newMul);
                    }}
                    className={innerSelect}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.label} value={u.multiplier}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column — Results */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Valuation Result
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Implied Equity Value</span>
            <span className="text-sm font-semibold text-text-primary">{fmtValFull(results.implied_value)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Implied Share Price</span>
            <span className="text-sm font-semibold text-text-primary">${results.implied_share_price.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Current Share Price</span>
            <span className="text-sm font-semibold text-text-primary">${results.current_price.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Upside / Downside</span>
            <span className={`text-sm font-semibold ${isUp ? "text-emerald-600" : "text-red-600"}`}>
              {isUp ? "+" : ""}{results.upside_pct.toFixed(1)}% {isUp ? "Undervalued" : "Overvalued"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { type Props as MultiplesModelProps };
