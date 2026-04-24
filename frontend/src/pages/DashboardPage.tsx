import { useState, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Loader2, ChevronDown } from "lucide-react";
import { getMacroSummaries } from "../services/macroApi";
import FearGreedCard from "../components/dashboard/FearGreedCard";
import MacroChart from "../components/dashboard/MacroChart";
import IndicatorToggle from "../components/dashboard/IndicatorToggle";

const PERIODS = [
  { label: "1 Month", value: "1mo" },
  { label: "3 Months", value: "3mo" },
  { label: "6 Months", value: "6mo" },
  { label: "1 Year", value: "1y" },
  { label: "2 Years", value: "2y" },
  { label: "5 Years", value: "5y" },
  { label: "10 Years", value: "10y" },
  { label: "Max", value: "max" },
] as const;

/** Animated skeleton placeholder. */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-surface-alt rounded-lg animate-pulse ${className}`} />;
}

/** Skeleton for the dashboard while loading. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Macro indicators dashboard with page-wide period filter and AI summaries. */
export default function DashboardPage() {
  const [period, setPeriod] = useState("6mo");

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["macroSummaries", period],
    queryFn: () => getMacroSummaries(period),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const [visible, setVisible] = useState<Set<string> | null>(null);

  const allSymbols = data?.indicators.map((i) => i.symbol) ?? [];
  const effectiveVisible = visible ?? new Set(allSymbols);

  const handleToggle = useCallback((symbol: string) => {
    setVisible((prev) => {
      const next = new Set(prev ?? allSymbols);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, [allSymbols]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase text-text-primary">Market Dashboard</h1>
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 size={28} className="text-text-muted animate-spin" />
          <p className="text-sm text-text-muted">Loading market data...</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase text-text-primary">Market Dashboard</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 size={32} className="text-text-muted mb-4" />
          <p className="text-sm text-text-muted">
            Unable to load market data. Make sure the backend is running.
          </p>
        </div>
      </div>
    );
  }

  const toggleList = data.indicators.map((i) => ({ symbol: i.symbol, name: i.name }));

  // Extract VIX data for the Fear & Greed card
  const vixIndicator = data.indicators.find((i) => i.symbol === "^VIX");
  const vixPrices = vixIndicator?.prices ?? [];
  const vixSummary = vixIndicator?.summary;

  // Non-VIX indicators for the chart grid
  const chartIndicators = data.indicators
    .filter((ind) => ind.symbol !== "^VIX" && effectiveVisible.has(ind.symbol));

  return (
    <div className="space-y-6">
      {/* Header with period filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase text-text-primary">Market Dashboard</h1>
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none bg-surface text-text-primary text-sm font-medium border border-border rounded-lg px-4 py-2 pr-9 cursor-pointer hover:bg-surface-alt transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Indicator toggles */}
      <IndicatorToggle
        indicators={toggleList}
        visible={effectiveVisible}
        onToggle={handleToggle}
        onSelectAll={() => setVisible(new Set(allSymbols))}
        onDeselectAll={() => setVisible(new Set())}
      />

      {/* Chart grid — Fear & Greed takes one grid slot */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
        {/* Fear & Greed card in the grid */}
        {effectiveVisible.has("^VIX") && (
          <FearGreedCard
            label={data.fear_greed_label}
            vix={data.fear_greed_vix}
            vixPrices={vixPrices}
            summary={vixSummary}
            period={period}
          />
        )}

        {/* Indicator charts */}
        {chartIndicators.map((ind) => (
          <MacroChart
            key={ind.symbol}
            symbol={ind.symbol}
            name={ind.name}
            currentValue={ind.current_value}
            changePct={ind.change_pct}
            prices={ind.prices}
            summary={ind.summary}
            period={period}
          />
        ))}
      </div>
    </div>
  );
}
