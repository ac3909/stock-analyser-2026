import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
    isFetching: ratiosFetching,
  } = useQuery({
    queryKey: ["batchRatios", compTickers],
    queryFn: () => getBatchRatios(compTickers),
    enabled: compTickers.length > 0,
    placeholderData: keepPreviousData,
  });

  const {
    data: compProfiles,
    isFetching: profilesFetching,
  } = useQuery({
    queryKey: ["batchProfiles", compTickers],
    queryFn: () => getBatchProfiles(compTickers),
    enabled: compTickers.length > 0,
    placeholderData: keepPreviousData,
  });

  const isFetching = ratiosFetching || profilesFetching;
  const comps = compRatios ?? [];

  const averages = useMemo(() => computeAverages(comps), [comps]);

  const fmtCap = (v: number | null) => {
    if (v == null) return "";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toFixed(0)}`;
  };

  const allProfiles = compProfiles ?? [];

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Search + comp chips */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Comparable Companies
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Add up to 10 companies to compare against{" "}
              <span className="font-semibold text-text-secondary">
                {currentProfile.name}
              </span>
            </p>
          </div>
        </div>

        <CompTickerSearch
          onAdd={handleAdd}
          exclude={[ticker, ...compTickers]}
        />

        {compTickers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-blue-600 bg-accent-subtle rounded-lg">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-text-primary bg-surface-alt rounded-lg"
                >
                  {sym}
                  {profile?.market_cap && (
                    <span className="text-xs font-normal text-text-muted">
                      {fmtCap(profile.market_cap)}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(sym)}
                    className="text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {comps.length === 0 && isFetching && compTickers.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          Fetching comparable data...
        </div>
      )}

      {comps.length > 0 && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                vs Peer Average
              </h4>
              {isFetching && <Loader2 size={14} className="animate-spin text-text-muted" />}
            </div>
            <CompsSummary subject={currentRatios} averages={averages} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Detailed Comparison
              </h4>
              {isFetching && <Loader2 size={14} className="animate-spin text-text-muted" />}
            </div>
            <CompsTable
              subject={currentRatios}
              comps={comps}
              averages={averages}
            />
          </div>
        </>
      )}

      {compTickers.length === 0 && (
        <div className="text-center py-12 text-sm text-text-muted">
          Search and add comparable companies above to see how{" "}
          <span className="font-semibold text-text-secondary">{ticker}</span> stacks
          up against its peers.
        </div>
      )}
    </div>
  );
}
