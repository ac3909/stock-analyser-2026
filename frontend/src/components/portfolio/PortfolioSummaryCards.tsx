import type { PortfolioPerformance } from "../../types/portfolio";

interface Props {
  performance: PortfolioPerformance;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-display uppercase tracking-wide text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-mono font-semibold ${color ?? "text-text-primary"}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1 font-mono">{sub}</p>}
    </div>
  );
}

export default function PortfolioSummaryCards({ performance }: Props) {
  const { total_value, total_cost, total_gain_loss, total_return_pct, positions } = performance;
  const returnColor = total_gain_loss >= 0 ? "text-green-400" : "text-red-400";
  const sign = total_gain_loss >= 0 ? "+" : "";

  const winners = positions.filter((p) => (p.gain_loss ?? 0) >= 0).length;
  const losers = positions.filter((p) => (p.gain_loss ?? 0) < 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Value"
        value={`$${total_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        sub={`Cost basis: $${total_cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
      />
      <StatCard
        label="Total Return"
        value={`${sign}${(total_return_pct * 100).toFixed(2)}%`}
        color={returnColor}
      />
      <StatCard
        label="Gain / Loss"
        value={`${sign}$${Math.abs(total_gain_loss).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        color={returnColor}
      />
      <StatCard
        label="Positions"
        value={String(positions.length)}
        sub={`${winners} winner${winners !== 1 ? "s" : ""} / ${losers} loser${losers !== 1 ? "s" : ""}`}
      />
    </div>
  );
}
