import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SearchX, WifiOff } from "lucide-react";
import CompanyProfile from "../components/stock/CompanyProfile";
import PriceChart from "../components/stock/PriceChart";
import RatiosCard from "../components/stock/RatiosCard";
import FinancialTable from "../components/stock/FinancialTable";
import ProjectionsSection from "../components/projections/ProjectionsSection";
import ComparablesSection from "../components/comparables/ComparablesSection";
import { isNetworkError, isNotFoundError } from "../services/api";
import {
  getCompanyProfile,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getKeyRatios,
} from "../services/stockApi";

const FINANCIAL_TABS = ["Income Statement", "Balance Sheet", "Cash Flow"] as const;
type FinancialTab = (typeof FINANCIAL_TABS)[number];

const SECTION_TABS = ["Financials", "Projections", "Comparables"] as const;
type SectionTab = (typeof SECTION_TABS)[number];

/** Animated skeleton placeholder block. */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />;
}

/** Skeleton for the company profile card. */
function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

/** Skeleton for the price chart. */
function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-72 rounded-lg" />
      </div>
      <Skeleton className="h-64 sm:h-80 w-full rounded-xl" />
    </div>
  );
}

/** Skeleton for the ratios section. */
function RatiosSkeleton() {
  return (
    <div>
      <Skeleton className="h-5 w-28 mb-4" />
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <Skeleton className="h-3.5 w-24 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the financial statements table. */
function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`flex gap-4 px-5 py-3 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
            <Skeleton className="h-3.5 w-40 shrink-0" />
            <Skeleton className="h-3.5 w-20 ml-auto" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full stock analysis page — profile, chart, financials, projections, and comparables. */
export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [activeSection, setActiveSection] = useState<SectionTab>("Financials");
  const [activeFinancialTab, setActiveFinancialTab] = useState<FinancialTab>("Income Statement");
  const [compTickers, setCompTickers] = useState<string[]>([]);
  const symbol = ticker?.toUpperCase() ?? "";

  const profileQuery = useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => getCompanyProfile(symbol),
    enabled: !!symbol,
    retry: (count, error) => !isNotFoundError(error) && count < 2,
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

  // --- Error states ---

  if (profileQuery.isError && isNetworkError(profileQuery.error)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <WifiOff size={48} className="text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Unable to connect to server</h3>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          The backend server isn't responding. Make sure it's running on port 8000.
        </p>
        <button
          onClick={() => profileQuery.refetch()}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  if (profileQuery.isError && isNotFoundError(profileQuery.error)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <SearchX size={48} className="text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Stock not found</h3>
        <p className="text-sm text-gray-400 mb-6">
          We couldn't find a stock with the ticker <span className="font-semibold text-gray-500">{symbol}</span>.
        </p>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Search for another stock
        </Link>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Something went wrong</h3>
        <p className="text-sm text-gray-400 mb-6">An unexpected error occurred while loading data.</p>
        <button
          onClick={() => profileQuery.refetch()}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  // --- Active financial tab data ---

  const activeStatements =
    activeFinancialTab === "Income Statement"
      ? incomeQuery.data?.statements
      : activeFinancialTab === "Balance Sheet"
        ? balanceQuery.data?.statements
        : cashFlowQuery.data?.statements;

  const statementsLoading =
    activeFinancialTab === "Income Statement"
      ? incomeQuery.isLoading
      : activeFinancialTab === "Balance Sheet"
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
      {profileQuery.isLoading ? (
        <ProfileSkeleton />
      ) : profileQuery.data ? (
        <CompanyProfile profile={profileQuery.data} ratios={ratiosQuery.data} />
      ) : null}

      {/* Price Chart */}
      {profileQuery.isLoading ? <ChartSkeleton /> : <PriceChart ticker={symbol} />}

      {/* Section-level tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {SECTION_TABS.map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer whitespace-nowrap ${
              activeSection === section
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {section}
            {activeSection === section && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === "Financials" && (
        <>
          {/* Key Ratios */}
          {ratiosQuery.isLoading ? (
            <RatiosSkeleton />
          ) : ratiosQuery.data ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Ratios</h3>
              <RatiosCard ratios={ratiosQuery.data} />
            </div>
          ) : ratiosQuery.isError ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              Ratio data unavailable
            </div>
          ) : null}

          {/* Financial Statements with tabs */}
          <div>
            <div className="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
              {FINANCIAL_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFinancialTab(tab)}
                  className={`px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer whitespace-nowrap ${
                    activeFinancialTab === tab
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                  {activeFinancialTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                  )}
                </button>
              ))}
            </div>

            {statementsLoading ? (
              <TableSkeleton />
            ) : (
              <FinancialTable statements={activeStatements ?? []} />
            )}
          </div>
        </>
      )}

      {activeSection === "Projections" && profileQuery.data && (
        <ProjectionsSection
          ticker={symbol}
          profile={profileQuery.data}
          ratios={ratiosQuery.data ?? null}
          income={incomeQuery.data ?? null}
          cashFlow={cashFlowQuery.data ?? null}
          balance={balanceQuery.data ?? null}
          compTickers={compTickers}
        />
      )}

      {activeSection === "Comparables" && profileQuery.data && ratiosQuery.data && (
        <ComparablesSection
          ticker={symbol}
          currentRatios={ratiosQuery.data}
          currentProfile={profileQuery.data}
          compTickers={compTickers}
          onCompTickersChange={setCompTickers}
        />
      )}

      {/* Fallback for Projections/Comparables when data not loaded */}
      {activeSection === "Projections" && !profileQuery.data && !profileQuery.isLoading && (
        <div className="text-center py-12 text-sm text-gray-400">
          Profile data required for projections. Please wait or try refreshing.
        </div>
      )}

      {activeSection === "Comparables" && (!profileQuery.data || !ratiosQuery.data) && !profileQuery.isLoading && (
        <div className="text-center py-12 text-sm text-gray-400">
          Profile and ratio data required for comparables. Please wait or try refreshing.
        </div>
      )}
    </div>
  );
}
