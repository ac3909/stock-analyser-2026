import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import type {
  CompanyProfile,
  KeyRatios,
  FinancialStatementResponse,
  DcfInputs,
  MultiplesInputs,
  ProjectionData,
  DcfResults,
} from "../../types/stock";
import { saveProjection } from "../../services/projectionApi";
import { getIndustryAverages } from "../../services/stockApi";
import { computeCompanyAverages } from "../../utils/historicalAverages";
import { calculateDcf } from "../../utils/dcf";
import DcfModel from "./DcfModel";
import MultiplesModel from "./MultiplesModel";
import SavedScenarios from "./SavedScenarios";

const MODEL_TABS = ["DCF", "Multiples"] as const;
type ModelTab = (typeof MODEL_TABS)[number];

interface Props {
  ticker: string;
  profile: CompanyProfile;
  ratios: KeyRatios | null;
  income: FinancialStatementResponse | null;
  cashFlow: FinancialStatementResponse | null;
  balance: FinancialStatementResponse | null;
  compTickers?: string[];
}

/**
 * Safely get a value from the most recent financial statement,
 * trying multiple field names as proxies.
 */
function getLatest(
  statements: FinancialStatementResponse | null,
  ...keys: string[]
): number | null {
  if (!statements || statements.statements.length === 0) return null;
  const data = statements.statements[0].data;
  for (const key of keys) {
    const val = data[key];
    if (val != null) return val;
  }
  return null;
}

/** Extract DCF defaults from the company's actual financials (per-year arrays). */
function buildDcfDefaults(props: Props): DcfInputs {
  const revenue = getLatest(props.income, "Total Revenue", "Revenue") ?? 0;
  const opIncome = getLatest(props.income, "Operating Income", "EBIT", "Gross Profit");
  const taxProvision = getLatest(props.income, "Tax Provision", "Income Tax Expense");
  const pretaxIncome = getLatest(props.income, "Pretax Income", "Income Before Tax");
  const capex = getLatest(
    props.cashFlow,
    "Capital Expenditure",
    "Purchase Of PPE",
    "Depreciation And Amortization"
  );

  const opMargin =
    revenue && opIncome != null ? (opIncome / revenue) * 100 : 20;
  const taxRate =
    pretaxIncome && taxProvision != null && pretaxIncome !== 0
      ? (taxProvision / pretaxIncome) * 100
      : 21;
  const capexPct =
    revenue && capex != null ? (Math.abs(capex) / revenue) * 100 : 5;

  const roundedMargin = Math.round(opMargin * 10) / 10;
  const roundedTax = Math.round(taxRate * 10) / 10;
  const roundedCapex = Math.round(capexPct * 10) / 10;

  return {
    revenue_growth_rates: [10, 10, 8, 8, 6],
    operating_margins: [roundedMargin, roundedMargin, roundedMargin, roundedMargin, roundedMargin],
    tax_rates: [roundedTax, roundedTax, roundedTax, roundedTax, roundedTax],
    capex_pct_revenues: [roundedCapex, roundedCapex, roundedCapex, roundedCapex, roundedCapex],
    wacc: 10,
    terminal_growth_rate: 2.5,
    shares_outstanding: props.profile.shares_outstanding ?? 1,
    base_revenue: revenue,
  };
}

/** Extract multiples defaults from the company's actual data. */
function buildMultiplesDefaults(props: Props): MultiplesInputs {
  const revenue = getLatest(props.income, "Total Revenue") ?? 0;
  const totalDebt = getLatest(props.balance, "Total Debt") ?? 0;
  const cash =
    getLatest(props.balance, "Cash And Cash Equivalents") ??
    getLatest(props.balance, "Cash Cash Equivalents And Short Term Investments") ??
    0;

  return {
    multiple_type: "ev_revenue",
    projected_metric_value: revenue,
    target_multiple: props.ratios?.price_to_sales ?? 5,
    shares_outstanding: props.profile.shares_outstanding ?? 1,
    net_debt: totalDebt - cash,
  };
}

/** Wrapper for the projections tab — DCF/Multiples sub-tabs, save/load. */
export default function ProjectionsSection(props: Props) {
  const { ticker, profile, compTickers } = props;
  const currentPrice = profile.current_price ?? 0;

  const [activeTab, setActiveTab] = useState<ModelTab>("DCF");
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [loadedData, setLoadedData] = useState<ProjectionData | null>(null);

  const queryClient = useQueryClient();

  // --- Build defaults ---
  const dcfDefaults = useMemo(() => buildDcfDefaults(props), [props.income, props.cashFlow, props.profile]);
  const multiplesDefaults = useMemo(() => buildMultiplesDefaults(props), [props.income, props.balance, props.ratios, props.profile]);

  // --- Lifted DCF input state ---
  const effectiveDcfInitial = loadedData?.model_type === "dcf" ? loadedData.inputs : dcfDefaults;
  const [dcfInputs, setDcfInputs] = useState<DcfInputs>(effectiveDcfInitial);

  // When a scenario is loaded, update dcfInputs
  const handleLoad = useCallback((data: ProjectionData) => {
    setLoadedData(data);
    setActiveTab(data.model_type === "dcf" ? "DCF" : "Multiples");
    if (data.model_type === "dcf") {
      setDcfInputs(data.inputs);
    }
  }, []);

  // --- Company historical averages (computed from already-fetched statements) ---
  const companyAverages = useMemo(
    () => computeCompanyAverages(props.income, props.cashFlow),
    [props.income, props.cashFlow]
  );

  // --- Industry averages (auto-fetched, or overridden by comp tickers) ---
  const { data: industryAverages, isLoading: industryAvgLoading } = useQuery({
    queryKey: ["industryAverages", ticker],
    queryFn: () => getIndustryAverages(ticker),
    enabled: !!ticker && (!compTickers || compTickers.length === 0),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // If user has selected comps, we don't use the industry endpoint.
  const effectiveIndustryAverages =
    compTickers && compTickers.length > 0 ? null : industryAverages ?? null;

  // --- Current actuals (for the "Current" column in the spreadsheet) ---
  const currentActuals = useMemo(() => {
    const revenue = getLatest(props.income, "Total Revenue", "Revenue");
    const opIncome = getLatest(props.income, "Operating Income", "EBIT", "Gross Profit");
    const taxProvision = getLatest(props.income, "Tax Provision", "Income Tax Expense");
    const pretaxIncome = getLatest(props.income, "Pretax Income", "Income Before Tax");
    const capex = getLatest(
      props.cashFlow,
      "Capital Expenditure",
      "Purchase Of PPE",
      "Depreciation And Amortization"
    );

    const opMargin =
      revenue && opIncome != null ? Math.round((opIncome / revenue) * 1000) / 10 : null;
    const taxRate =
      pretaxIncome && taxProvision != null && pretaxIncome !== 0
        ? Math.round((taxProvision / pretaxIncome) * 1000) / 10
        : null;
    const capexPct =
      revenue && capex != null ? Math.round((Math.abs(capex) / revenue) * 1000) / 10 : null;

    return { revenue, opMargin, taxRate, capexPct };
  }, [props.income, props.cashFlow]);

  // --- Save mutation ---
  const saveMutation = useMutation({
    mutationFn: (data: ProjectionData) =>
      saveProjection(ticker, saveTitle, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projections", ticker] });
      setShowSaveInput(false);
      setSaveTitle("");
    },
  });

  const effectiveMultiplesDefaults =
    loadedData?.model_type === "multiples"
      ? loadedData.inputs
      : multiplesDefaults;

  /** Build projection data from current live state for saving. */
  const buildSaveData = (): ProjectionData => {
    if (activeTab === "DCF") {
      const results: DcfResults = calculateDcf(dcfInputs, currentPrice);
      return {
        model_type: "dcf",
        inputs: dcfInputs,
        results,
      };
    }
    // For multiples, we save the defaults (MultiplesModel manages its own state internally)
    return {
      model_type: "multiples",
      inputs: effectiveMultiplesDefaults,
      results: {
        implied_value: 0,
        implied_share_price: 0,
        current_price: currentPrice,
        upside_pct: 0,
      },
    };
  };

  return (
    <div className="space-y-6">
      {/* Model sub-tabs + save button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-surface-alt rounded-lg p-1">
          {MODEL_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setLoadedData(null);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Save trigger */}
        {!showSaveInput ? (
          <button
            onClick={() => setShowSaveInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-accent-subtle rounded-lg hover:opacity-80 transition-colors cursor-pointer"
          >
            <Save size={14} />
            Save Scenario
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Scenario name..."
              className="bg-surface-alt border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => {
                if (!saveTitle.trim()) return;
                saveMutation.mutate(buildSaveData());
              }}
              disabled={saveMutation.isPending || !saveTitle.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowSaveInput(false);
                setSaveTitle("");
              }}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Active model */}
      {activeTab === "DCF" ? (
        <DcfModel
          inputs={dcfInputs}
          defaults={dcfDefaults}
          onInputsChange={setDcfInputs}
          currentPrice={currentPrice}
          companyAverages={companyAverages}
          industryAverages={effectiveIndustryAverages}
          industryAvgLoading={industryAvgLoading}
          currentActuals={currentActuals}
        />
      ) : (
        <MultiplesModel
          key={loadedData?.model_type === "multiples" ? "loaded" : "default"}
          defaults={effectiveMultiplesDefaults}
          currentPrice={currentPrice}
        />
      )}

      {/* Saved scenarios */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Saved Scenarios
        </h4>
        <SavedScenarios ticker={ticker} onLoad={handleLoad} />
      </div>
    </div>
  );
}
