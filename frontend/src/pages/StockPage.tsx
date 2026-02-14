import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import CompanyProfile from "../components/stock/CompanyProfile";
import PriceChart from "../components/stock/PriceChart";
import RatiosCard from "../components/stock/RatiosCard";
import FinancialTable from "../components/stock/FinancialTable";
import {
  getCompanyProfile,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getKeyRatios,
} from "../services/stockApi";

const TABS = ["Income Statement", "Balance Sheet", "Cash Flow"] as const;
type Tab = (typeof TABS)[number];

/** Full stock analysis page — profile, chart, ratios, and financial statements. */
export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("Income Statement");
  const symbol = ticker?.toUpperCase() ?? "";

  const profileQuery = useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => getCompanyProfile(symbol),
    enabled: !!symbol,
  });

  const ratiosQuery = useQuery({
    queryKey: ["ratios", symbol],
    queryFn: () => getKeyRatios(symbol),
    enabled: !!symbol,
  });

  const incomeQuery = useQuery({
    queryKey: ["income", symbol],
    queryFn: () => getIncomeStatement(symbol),
    enabled: !!symbol,
  });

  const balanceQuery = useQuery({
    queryKey: ["balance", symbol],
    queryFn: () => getBalanceSheet(symbol),
    enabled: !!symbol,
  });

  const cashFlowQuery = useQuery({
    queryKey: ["cashflow", symbol],
    queryFn: () => getCashFlow(symbol),
    enabled: !!symbol,
  });

  const isLoading = profileQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton: profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="h-7 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl h-16" />
            ))}
          </div>
        </div>
        {/* Skeleton: chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-5" />
          <div className="h-72 bg-gray-50 rounded-xl" />
        </div>
        {/* Skeleton: ratios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-500 mb-4">
          Could not find data for <span className="font-semibold">{symbol}</span>
        </p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Back to search
        </Link>
      </div>
    );
  }

  const activeStatements =
    activeTab === "Income Statement"
      ? incomeQuery.data?.statements
      : activeTab === "Balance Sheet"
        ? balanceQuery.data?.statements
        : cashFlowQuery.data?.statements;

  const statementsLoading =
    activeTab === "Income Statement"
      ? incomeQuery.isLoading
      : activeTab === "Balance Sheet"
        ? balanceQuery.isLoading
        : cashFlowQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to search
      </Link>

      {/* Company Profile */}
      {profileQuery.data && (
        <CompanyProfile profile={profileQuery.data} ratios={ratiosQuery.data} />
      )}

      {/* Price Chart */}
      <PriceChart ticker={symbol} />

      {/* Key Ratios */}
      {ratiosQuery.data && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Ratios</h3>
          <RatiosCard ratios={ratiosQuery.data} />
        </div>
      )}

      {/* Financial Statements with tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === tab
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {statementsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <FinancialTable statements={activeStatements ?? []} />
        )}
      </div>
    </div>
  );
}
