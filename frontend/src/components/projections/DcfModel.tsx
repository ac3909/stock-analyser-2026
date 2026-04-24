import { useState, useMemo } from "react";
import { Copy, RotateCcw, Loader2 } from "lucide-react";
import type {
  DcfInputs,
  DcfResults,
  CompanyAverages,
  IndustryAverages,
} from "../../types/stock";
import { calculateDcf } from "../../utils/dcf";
import { fmtVal, fmtValFull, fmtPct } from "../../utils/format";
import { UNIT_OPTIONS, detectUnit } from "../../utils/units";

const sharesInputClass =
  "w-24 bg-transparent border-none px-3 py-1.5 text-sm text-right text-text-primary focus:outline-none";
const sharesSelectClass =
  "bg-transparent border-none pr-3 pl-1 py-1.5 text-sm text-text-secondary focus:outline-none cursor-pointer";

/** Keys into the per-year array fields of DcfInputs. */
type ArrayKey =
  | "revenue_growth_rates"
  | "operating_margins"
  | "tax_rates"
  | "capex_pct_revenues";

/** Definition of an editable assumption row. */
interface AssumptionRow {
  label: string;
  key: ArrayKey;
  companyAvgKey: keyof CompanyAverages;
  industryAvgKey: keyof IndustryAverages;
  currentActual: number | null;
}

const ASSUMPTION_ROWS: AssumptionRow[] = [
  {
    label: "Revenue Growth (%)",
    key: "revenue_growth_rates",
    companyAvgKey: "revenue_growth",
    industryAvgKey: "revenue_growth",
    currentActual: null,
  },
  {
    label: "Operating Margin (%)",
    key: "operating_margins",
    companyAvgKey: "operating_margin",
    industryAvgKey: "operating_margin",
    currentActual: null,
  },
  {
    label: "Tax Rate (%)",
    key: "tax_rates",
    companyAvgKey: "tax_rate",
    industryAvgKey: "tax_rate",
    currentActual: null,
  },
  {
    label: "Capex / Revenue (%)",
    key: "capex_pct_revenues",
    companyAvgKey: "capex_pct_revenue",
    industryAvgKey: "capex_pct_revenue",
    currentActual: null,
  },
];

/** Definition of a computed (read-only) row. */
interface ComputedRow {
  label: string;
  getValue: (yearIdx: number, results: DcfResults) => number;
  format: "currency" | "pct" | "factor";
  currentActual?: number | null;
}

interface Props {
  inputs: DcfInputs;
  defaults: DcfInputs;
  onInputsChange: (inputs: DcfInputs) => void;
  currentPrice: number;
  companyAverages: CompanyAverages;
  industryAverages: IndustryAverages | null;
  industryAvgLoading?: boolean;
  currentActuals: {
    revenue: number | null;
    opMargin: number | null;
    taxRate: number | null;
    capexPct: number | null;
  };
}

/** Excel-style DCF spreadsheet with per-year editable assumptions and computed outputs. */
export default function DcfModel({
  inputs,
  defaults,
  onInputsChange,
  currentPrice,
  companyAverages,
  industryAverages,
  industryAvgLoading,
  currentActuals,
}: Props) {
  const [sharesUnit, setSharesUnit] = useState(() => detectUnit(inputs.shares_outstanding));

  const results: DcfResults = useMemo(
    () => calculateDcf(inputs, currentPrice),
    [inputs, currentPrice]
  );

  const updateYear = (key: ArrayKey, yearIdx: number, value: number) => {
    const arr = [...inputs[key]];
    arr[yearIdx] = value;
    onInputsChange({ ...inputs, [key]: arr });
  };

  const copyToAll = (key: ArrayKey) => {
    const arr = [...inputs[key]];
    for (let i = 1; i < 5; i++) arr[i] = arr[0];
    onInputsChange({ ...inputs, [key]: arr });
  };

  const resetRow = (key: ArrayKey) => {
    onInputsChange({ ...inputs, [key]: [...defaults[key]] });
  };

  const resetAll = () => {
    onInputsChange({ ...defaults });
  };

  const updateGlobal = (key: "wacc" | "terminal_growth_rate" | "shares_outstanding", value: number) => {
    onInputsChange({ ...inputs, [key]: value });
  };

  const currentActualValues: Record<ArrayKey, number | null> = {
    revenue_growth_rates: null,
    operating_margins: currentActuals.opMargin,
    tax_rates: currentActuals.taxRate,
    capex_pct_revenues: currentActuals.capexPct,
  };

  const COMPUTED_ROWS: ComputedRow[] = [
    { label: "Revenue", getValue: (i, r) => r.years[i].revenue, format: "currency", currentActual: currentActuals.revenue },
    { label: "Operating Income", getValue: (i, r) => r.years[i].operating_income, format: "currency" },
    { label: "Taxes", getValue: (i, r) => r.years[i].taxes, format: "currency" },
    { label: "NOPAT", getValue: (i, r) => r.years[i].nopat, format: "currency" },
    { label: "Capital Expenditure", getValue: (i, r) => r.years[i].capex, format: "currency" },
    { label: "Free Cash Flow", getValue: (i, r) => r.years[i].fcf, format: "currency" },
    { label: "Discount Factor", getValue: (i, r) => r.years[i].discount_factor, format: "factor" },
    { label: "PV of FCF", getValue: (i, r) => r.years[i].pv_fcf, format: "currency" },
  ];

  const formatComputed = (value: number, format: string) => {
    if (format === "currency") return fmtVal(value);
    if (format === "pct") return fmtPct(value);
    return value.toFixed(4);
  };

  const isUp = results.upside_pct >= 0;

  return (
    <div className="space-y-6">
      {/* Spreadsheet table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-text-primary">DCF Model</h4>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide sticky left-0 bg-surface-alt z-10 min-w-[180px]">
                  Metric
                </th>
                <th className="px-1 py-2.5 w-[60px] bg-surface-alt" />
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide min-w-[80px] bg-surface-alt">
                  Co. Avg
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide min-w-[80px] bg-surface-alt">
                  Ind. Avg
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide min-w-[90px] bg-surface-alt">
                  Current
                </th>
                {[1, 2, 3, 4, 5].map((yr) => (
                  <th
                    key={yr}
                    className="text-right px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide min-w-[90px] bg-surface-alt"
                  >
                    Year {yr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Section: Assumptions */}
              <tr>
                <td
                  colSpan={10}
                  className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-alt/50"
                >
                  Assumptions
                </td>
              </tr>
              {ASSUMPTION_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/30 hover:bg-accent-subtle/20">
                  <td className="px-4 py-1.5 text-text-primary font-medium sticky left-0 bg-surface z-10">
                    {row.label}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => copyToAll(row.key)}
                        title="Copy Year 1 to all"
                        className="p-1 text-text-muted hover:text-blue-500 rounded transition-colors cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => resetRow(row.key)}
                        title="Reset to defaults"
                        className="p-1 text-text-muted hover:text-text-secondary rounded transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="text-right px-3 py-1.5 text-text-muted tabular-nums bg-surface-alt/30">
                    {fmtPct(companyAverages[row.companyAvgKey])}
                  </td>
                  <td className="text-right px-3 py-1.5 text-text-muted tabular-nums bg-surface-alt/30">
                    {industryAvgLoading ? (
                      <Loader2 size={14} className="animate-spin inline-block text-text-muted" />
                    ) : industryAverages ? (
                      fmtPct(industryAverages[row.industryAvgKey] as number | null)
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right px-3 py-1.5 text-text-secondary tabular-nums font-medium">
                    {fmtPct(currentActualValues[row.key])}
                  </td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="px-1.5 py-1">
                      <input
                        type="number"
                        value={inputs[row.key][yi]}
                        onChange={(e) =>
                          updateYear(row.key, yi, parseFloat(e.target.value) || 0)
                        }
                        step={0.5}
                        className="w-full bg-accent-subtle/60 border border-blue-200/50 rounded px-2 py-1 text-sm text-right text-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-accent-subtle"
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Income */}
              <tr>
                <td colSpan={10} className="px-4 pt-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-alt/50">
                  Income
                </td>
              </tr>
              {COMPUTED_ROWS.slice(0, 4).map((row, idx) => (
                <tr key={row.label} className={`border-b border-border/30 ${idx % 2 === 1 ? "bg-surface-alt/30" : ""}`}>
                  <td className="px-4 py-1.5 text-text-primary font-medium sticky left-0 bg-inherit z-10">{row.label}</td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-secondary tabular-nums font-medium">
                    {row.currentActual != null ? fmtVal(row.currentActual) : "—"}
                  </td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-text-primary tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Cash Flow */}
              <tr>
                <td colSpan={10} className="px-4 pt-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-alt/50">
                  Cash Flow
                </td>
              </tr>
              {COMPUTED_ROWS.slice(4, 6).map((row, idx) => (
                <tr key={row.label} className={`border-b border-border/30 ${idx % 2 === 1 ? "bg-surface-alt/30" : ""}`}>
                  <td className="px-4 py-1.5 text-text-primary font-medium sticky left-0 bg-inherit z-10">{row.label}</td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-muted">—</td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-text-primary tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Valuation */}
              <tr>
                <td colSpan={10} className="px-4 pt-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-alt/50">
                  Valuation
                </td>
              </tr>
              {COMPUTED_ROWS.slice(6).map((row, idx) => (
                <tr key={row.label} className={`border-b border-border/30 ${idx % 2 === 1 ? "bg-surface-alt/30" : ""}`}>
                  <td className="px-4 py-1.5 text-text-primary font-medium sticky left-0 bg-inherit z-10">{row.label}</td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-muted bg-surface-alt/30">—</td>
                  <td className="text-right px-3 py-1.5 text-text-muted">—</td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-text-primary tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Valuation summary card — 3 columns: inputs | calculated values | share prices */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left — Global inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Inputs</h4>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">WACC</span>
              <div className="flex items-center w-40 bg-surface-alt border border-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="number"
                  value={inputs.wacc}
                  onChange={(e) => updateGlobal("wacc", parseFloat(e.target.value) || 0)}
                  step={0.5}
                  className="flex-1 min-w-0 bg-transparent border-none px-3 py-1.5 text-sm text-right text-text-primary focus:outline-none"
                />
                <span className="pr-3 text-sm text-text-muted">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">Terminal Growth</span>
              <div className="flex items-center w-40 bg-surface-alt border border-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="number"
                  value={inputs.terminal_growth_rate}
                  onChange={(e) => updateGlobal("terminal_growth_rate", parseFloat(e.target.value) || 0)}
                  step={0.5}
                  className="flex-1 min-w-0 bg-transparent border-none px-3 py-1.5 text-sm text-right text-text-primary focus:outline-none"
                />
                <span className="pr-3 text-sm text-text-muted">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-text-secondary">Shares Outstanding</span>
              <div className="flex items-center w-40 bg-surface-alt border border-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="number"
                  value={parseFloat((inputs.shares_outstanding / sharesUnit).toFixed(4))}
                  onChange={(e) => updateGlobal("shares_outstanding", (parseFloat(e.target.value) || 0) * sharesUnit)}
                  step={1}
                  className={sharesInputClass}
                />
                <select
                  value={sharesUnit}
                  onChange={(e) => {
                    const newMul = Number(e.target.value);
                    const displayVal = inputs.shares_outstanding / sharesUnit;
                    setSharesUnit(newMul);
                    updateGlobal("shares_outstanding", displayVal * newMul);
                  }}
                  className={sharesSelectClass}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.label} value={u.multiplier}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Middle — Calculated FCF values */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Calculated Values</h4>
            {(() => {
              const sumPvFcf = results.years.reduce((s, y) => s + y.pv_fcf, 0);
              const metrics = [
                { label: "Sum of PV (FCF)", value: sumPvFcf },
                { label: "Terminal Value", value: results.terminal_value },
                { label: "PV of Terminal Value", value: results.pv_terminal_value },
                { label: "Enterprise Value", value: results.enterprise_value },
              ];
              return metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">{m.label}</span>
                  <span className="text-sm font-semibold text-text-primary">{fmtValFull(m.value)}</span>
                </div>
              ));
            })()}
          </div>

          {/* Right — Share prices + overvalued/undervalued */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Valuation</h4>
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
    </div>
  );
}
