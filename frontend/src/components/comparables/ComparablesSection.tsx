import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import type { KeyRatios, CompanyProfile } from "../../types/stock";
import { getBatchRatios, getBatchProfiles } from "../../services/stockApi";
import { computeAverages } from "../../utils/comps";
import CompTickerSearch from "./CompTickerSearch";
import CompsTable from "./CompsTable";
import CompsSummary from "./CompsSummary";

interface Props {
  ticker: string;
  currentRatios: KeyRatios;
  currentProfile: CompanyProfile;
  compTickers: string[];
  onCompTickersChange: (tickers: string[]) => void;
}

/** Wrapper for the comparables tab — search, chips, table, and summary. */
export default function ComparablesSection({
  ticker,
  currentRatios,
  currentProfile,
  compTickers,
  onCompTickersChange,
}: Props) {
  const handleAdd = (sym: string) => {
    if (compTickers.length >= 10) return;
    if (!compTickers.includes(sym)) {
      onCompTickersChange([...compTickers, sym]);
    }
  };

  const handleRemove = (sym: string) => {
    onCompTickersChange(compTickers.filter((t) => t !== sym));
  };

  const {
    data: compRatios,
    isLoading: ratiosLoading,
  } = useQuery({
    queryKey: ["batchRatios", compTickers],
    queryFn: () => getBatchRatios(compTickers),
    enabled: compTickers.length > 0,
  });

  const {
    data: compProfiles,
    isLoading: profilesLoading,
  } = useQuery({
    queryKey: ["batchProfiles", compTickers],
    queryFn: () => getBatchProfiles(compTickers),
    enabled: compTickers.length > 0,
  });

  const isLoading = ratiosLoading || profilesLoading;
  const comps = compRatios ?? [];

  const averages = useMemo(() => computeAverages(comps), [comps]);

  /** Format market cap for the profile chips. */
  const fmtCap = (v: number | null) => {
    if (v == null) return "";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toFixed(0)}`;
  };

  const allProfiles = compProfiles ?? [];

  return (
    <div className="space-y-6">
      {/* Search + comp chips */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Comparable Companies
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Add up to 10 companies to compare against{" "}
              <span className="font-semibold text-gray-600">
                {currentProfile.name}
              </span>
            </p>
          </div>
        </div>

        <CompTickerSearch
          onAdd={handleAdd}
          exclude={[ticker, ...compTickers]}
        />

        {/* Selected comp chips */}
        {compTickers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {/* Subject chip (non-removable) */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg">
              {ticker}
              {currentProfile.market_cap && (
                <span className="text-xs font-normal text-blue-400">
                  {fmtCap(currentProfile.market_cap)}
                </span>
              )}
            </span>

            {compTickers.map((sym) => {
              const profile = allProfiles.find((p) => p.symbol === sym);
              return (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
                >
                  {sym}
                  {profile?.market_cap && (
                    <span className="text-xs font-normal text-gray-400">
                      {fmtCap(profile.market_cap)}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(sym)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && compTickers.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Fetching comparable data...
        </div>
      )}

      {/* Results */}
      {comps.length > 0 && !isLoading && (
        <>
          {/* Summary cards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              vs Peer Average
            </h4>
            <CompsSummary subject={currentRatios} averages={averages} />
          </div>

          {/* Full comparison table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Detailed Comparison
            </h4>
            <CompsTable
              subject={currentRatios}
              comps={comps}
              averages={averages}
            />
          </div>
        </>
      )}

      {/* Empty state */}
      {compTickers.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">
          Search and add comparable companies above to see how{" "}
          <span className="font-semibold text-gray-500">{ticker}</span> stacks
          up against its peers.
        </div>
      )}
    </div>
  );
}
