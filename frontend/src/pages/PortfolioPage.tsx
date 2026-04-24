import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  listPortfolios,
  createPortfolio,
  getPortfolioPerformance,
  getPortfolioHistory,
  getPortfolioScore,
  deletePosition,
} from "../services/portfolioApi";
import PortfolioBuilder from "../components/portfolio/PortfolioBuilder";
import PortfolioSummaryCards from "../components/portfolio/PortfolioSummaryCards";
import PositionsTable from "../components/portfolio/PositionsTable";
import PortfolioValueChart from "../components/portfolio/PortfolioValueChart";
import AllocationChart from "../components/portfolio/AllocationChart";
import PortfolioScoreCard from "../components/portfolio/PortfolioScoreCard";

export default function PortfolioPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: listPortfolios,
  });

  const portfolio = portfoliosQuery.data?.[0];

  const performanceQuery = useQuery({
    queryKey: ["portfolioPerformance", portfolio?.id],
    queryFn: () => getPortfolioPerformance(portfolio!.id),
    enabled: !!portfolio?.id,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ["portfolioHistory", portfolio?.id],
    queryFn: () => getPortfolioHistory(portfolio!.id),
    enabled: !!portfolio?.id,
    staleTime: 5 * 60_000,
  });

  const scoreQuery = useQuery({
    queryKey: ["portfolioScore", portfolio?.id],
    queryFn: () => getPortfolioScore(portfolio!.id),
    enabled: !!portfolio?.id && (performanceQuery.data?.positions.length ?? 0) > 0,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => createPortfolio(newName.trim() || "My Portfolio"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      setShowCreate(false);
      setNewName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolioPerformance", portfolio?.id] });
      qc.invalidateQueries({ queryKey: ["portfolioScore", portfolio?.id] });
      qc.invalidateQueries({ queryKey: ["portfolioHistory", portfolio?.id] });
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["portfolioPerformance", portfolio?.id] });
    qc.invalidateQueries({ queryKey: ["portfolioScore", portfolio?.id] });
    qc.invalidateQueries({ queryKey: ["portfolioHistory", portfolio?.id] });
  };

  if (portfoliosQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl uppercase tracking-wide text-text-primary mb-2">
          Portfolio
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Track your holdings and get AI-powered factor analysis.
        </p>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-accent text-white font-display uppercase tracking-wide rounded-xl hover:opacity-90 transition-opacity"
          >
            Create Portfolio
          </button>
        ) : (
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted font-display uppercase tracking-wide">
                Portfolio Name
              </label>
              <input
                autoFocus
                className="bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="My Portfolio"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createMutation.mutate()}
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-accent text-white text-sm font-display uppercase tracking-wide rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    );
  }

  const perf = performanceQuery.data;
  const history = historyQuery.data ?? [];
  const score = scoreQuery.data;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="font-display text-4xl uppercase tracking-wide text-text-primary">
        {portfolio.name}
      </h1>

      {perf && <PortfolioSummaryCards performance={perf} />}
      {performanceQuery.isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-xl p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-display text-sm uppercase tracking-wide text-text-secondary">
          Add Positions
        </h2>
        <PortfolioBuilder portfolioId={portfolio.id} onPositionAdded={invalidateAll} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-wide text-text-secondary">
          Holdings
        </h2>
        {perf ? (
          <PositionsTable
            positions={perf.positions}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ) : performanceQuery.isLoading ? (
          <div className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
        ) : null}
      </section>

      {perf && perf.positions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioValueChart data={history} />
          <AllocationChart positions={perf.positions} />
        </div>
      )}

      {perf && perf.positions.length > 0 && (
        <section>
          {scoreQuery.isLoading && (
            <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-sm text-text-muted">Generating portfolio score…</span>
            </div>
          )}
          {score && <PortfolioScoreCard score={score} />}
        </section>
      )}
    </main>
  );
}
