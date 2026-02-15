import { useMemo } from "react";
import { Copy, RotateCcw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type {
  DcfInputs,
  DcfResults,
  CompanyAverages,
  IndustryAverages,
} from "../../types/stock";
import { calculateDcf } from "../../utils/dcf";

/** Format large numbers with B/M/K suffixes. */
function fmtVal(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Format a percentage value for display. */
function fmtPct(v: number | null): string {
  return v != null ? `${v.toFixed(1)}%` : "—";
}

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
    currentActual: null, // no "current" growth rate
  },
  {
    label: "Operating Margin (%)",
    key: "operating_margins",
    companyAvgKey: "operating_margin",
    industryAvgKey: "operating_margin",
    currentActual: null, // filled via props
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
  const results: DcfResults = useMemo(
    () => calculateDcf(inputs, currentPrice),
    [inputs, currentPrice]
  );

  /** Update a single year's value in a per-year array. */
  const updateYear = (key: ArrayKey, yearIdx: number, value: number) => {
    const arr = [...inputs[key]];
    arr[yearIdx] = value;
    onInputsChange({ ...inputs, [key]: arr });
  };

  /** Copy Year 1 value to Years 2-5. */
  const copyToAll = (key: ArrayKey) => {
    const arr = [...inputs[key]];
    for (let i = 1; i < 5; i++) arr[i] = arr[0];
    onInputsChange({ ...inputs, [key]: arr });
  };

  /** Reset a row to its defaults. */
  const resetRow = (key: ArrayKey) => {
    onInputsChange({ ...inputs, [key]: [...defaults[key]] });
  };

  /** Reset all inputs to defaults. */
  const resetAll = () => {
    onInputsChange({ ...defaults });
  };

  /** Update a global (non-array) input. */
  const updateGlobal = (key: "wacc" | "terminal_growth_rate" | "shares_outstanding", value: number) => {
    onInputsChange({ ...inputs, [key]: value });
  };

  // Map current actuals to assumption rows
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
  const UpsideIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Spreadsheet table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Reset All button */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">DCF Model</h4>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                  Metric
                </th>
                <th className="px-1 py-2.5 w-[60px] bg-gray-50" />
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[80px] bg-gray-50">
                  Co. Avg
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[80px] bg-gray-50">
                  Ind. Avg
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[90px] bg-gray-50">
                  Current
                </th>
                {[1, 2, 3, 4, 5].map((yr) => (
                  <th
                    key={yr}
                    className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[90px] bg-gray-50"
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
                  className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                >
                  Assumptions
                </td>
              </tr>
              {ASSUMPTION_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-gray-50 hover:bg-blue-50/20">
                  {/* Label */}
                  <td className="px-4 py-1.5 text-gray-700 font-medium sticky left-0 bg-white z-10">
                    {row.label}
                  </td>
                  {/* Actions */}
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => copyToAll(row.key)}
                        title="Copy Year 1 to all"
                        className="p-1 text-gray-300 hover:text-blue-500 rounded transition-colors cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => resetRow(row.key)}
                        title="Reset to defaults"
                        className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </td>
                  {/* Company Avg */}
                  <td className="text-right px-3 py-1.5 text-gray-400 tabular-nums bg-gray-50/30">
                    {fmtPct(companyAverages[row.companyAvgKey])}
                  </td>
                  {/* Industry Avg */}
                  <td className="text-right px-3 py-1.5 text-gray-400 tabular-nums bg-gray-50/30">
                    {industryAvgLoading ? (
                      <Loader2 size={14} className="animate-spin inline-block text-gray-300" />
                    ) : industryAverages ? (
                      fmtPct(industryAverages[row.industryAvgKey] as number | null)
                    ) : (
                      "—"
                    )}
                  </td>
                  {/* Current */}
                  <td className="text-right px-3 py-1.5 text-gray-600 tabular-nums font-medium">
                    {fmtPct(currentActualValues[row.key])}
                  </td>
                  {/* Year 1-5 inputs */}
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="px-1.5 py-1">
                      <input
                        type="number"
                        value={inputs[row.key][yi]}
                        onChange={(e) =>
                          updateYear(row.key, yi, parseFloat(e.target.value) || 0)
                        }
                        step={0.5}
                        className="w-full bg-blue-50/60 border border-blue-100 rounded px-2 py-1 text-sm text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Income */}
              <tr>
                <td
                  colSpan={10}
                  className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                >
                  Income
                </td>
              </tr>
              {COMPUTED_ROWS.slice(0, 4).map((row, idx) => (
                <tr key={row.label} className={`border-b border-gray-50 ${idx % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                  <td className="px-4 py-1.5 text-gray-700 font-medium sticky left-0 bg-inherit z-10">
                    {row.label}
                  </td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-600 tabular-nums font-medium">
                    {row.currentActual != null ? fmtVal(row.currentActual) : "—"}
                  </td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-gray-900 tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Cash Flow */}
              <tr>
                <td
                  colSpan={10}
                  className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                >
                  Cash Flow
                </td>
              </tr>
              {COMPUTED_ROWS.slice(4, 6).map((row, idx) => (
                <tr key={row.label} className={`border-b border-gray-50 ${idx % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                  <td className="px-4 py-1.5 text-gray-700 font-medium sticky left-0 bg-inherit z-10">
                    {row.label}
                  </td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-300">—</td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-gray-900 tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Section: Valuation */}
              <tr>
                <td
                  colSpan={10}
                  className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50"
                >
                  Valuation
                </td>
              </tr>
              {COMPUTED_ROWS.slice(6).map((row, idx) => (
                <tr key={row.label} className={`border-b border-gray-50 ${idx % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                  <td className="px-4 py-1.5 text-gray-700 font-medium sticky left-0 bg-inherit z-10">
                    {row.label}
                  </td>
                  <td />
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-300 bg-gray-50/30">—</td>
                  <td className="text-right px-3 py-1.5 text-gray-300">—</td>
                  {[0, 1, 2, 3, 4].map((yi) => (
                    <td key={yi} className="text-right px-3 py-1.5 text-gray-900 tabular-nums">
                      {formatComputed(row.getValue(yi, results), row.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Valuation summary card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Global inputs */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">WACC (%)</label>
            <input
              type="number"
              value={inputs.wacc}
              onChange={(e) => updateGlobal("wacc", parseFloat(e.target.value) || 0)}
              step={0.5}
              className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Terminal Growth (%)</label>
            <input
              type="number"
              value={inputs.terminal_growth_rate}
              onChange={(e) => updateGlobal("terminal_growth_rate", parseFloat(e.target.value) || 0)}
              step={0.5}
              className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shares Outstanding</label>
            <input
              type="number"
              value={inputs.shares_outstanding}
              onChange={(e) => updateGlobal("shares_outstanding", parseFloat(e.target.value) || 0)}
              step={1000000}
              className="w-40 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Summary results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">Sum of PV (FCF)</p>
            <p className="text-sm font-semibold text-gray-900">
              {fmtVal(results.years.reduce((s, y) => s + y.pv_fcf, 0))}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">Terminal Value</p>
            <p className="text-sm font-semibold text-gray-900">{fmtVal(results.terminal_value)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">PV of Terminal Value</p>
            <p className="text-sm font-semibold text-gray-900">{fmtVal(results.pv_terminal_value)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">Enterprise Value</p>
            <p className="text-sm font-semibold text-gray-900">{fmtVal(results.enterprise_value)}</p>
          </div>
        </div>

        {/* Implied price headline */}
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
