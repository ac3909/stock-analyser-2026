import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getMacroIndicators } from "../services/macroApi";
import FearGreedCard from "../components/dashboard/FearGreedCard";
import MacroChart from "../components/dashboard/MacroChart";
import IndicatorToggle from "../components/dashboard/IndicatorToggle";

/** Animated skeleton placeholder. */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-surface-alt rounded-lg animate-pulse ${className}`} />;
}

/** Skeleton for the dashboard while loading. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Macro indicators dashboard with Fear & Greed gauge and toggleable charts. */
export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["macroIndicators"],
    queryFn: () => getMacroIndicators("6mo"),
    staleTime: 5 * 60 * 1000,
  });

  const [visible, setVisible] = useState<Set<string> | null>(null);

  // Initialize visible set once data arrives
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Market Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Market Dashboard</h1>
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Market Dashboard</h1>

      {/* Fear & Greed */}
      <FearGreedCard label={data.fear_greed_label} vix={data.fear_greed_vix} />

      {/* Indicator toggles */}
      <IndicatorToggle indicators={toggleList} visible={effectiveVisible} onToggle={handleToggle} />

      {/* Chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.indicators
          .filter((ind) => effectiveVisible.has(ind.symbol))
          .map((ind) => (
            <MacroChart
              key={ind.symbol}
              symbol={ind.symbol}
              name={ind.name}
              initialValue={ind.current_value}
              initialChangePct={ind.change_pct}
            />
          ))}
      </div>
    </div>
  );
}
