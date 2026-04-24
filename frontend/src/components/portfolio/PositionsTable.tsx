import { Trash2 } from "lucide-react";
import type { PositionPerformance } from "../../types/portfolio";

interface Props {
  positions: PositionPerformance[];
  onDelete: (positionId: string) => void;
}

function Dash() {
  return <span className="text-text-muted">—</span>;
}

function GainLoss({ value }: { value: number | null }) {
  if (value === null) return <Dash />;
  const color = value >= 0 ? "text-green-400" : "text-red-400";
  return (
    <span className={`${color} font-mono`}>
      {value >= 0 ? "+" : ""}
      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function ReturnPct({ value }: { value: number | null }) {
  if (value === null) return <Dash />;
  const color = value >= 0 ? "text-green-400" : "text-red-400";
  return (
    <span className={`${color} font-mono`}>
      {value >= 0 ? "+" : ""}
      {(value * 100).toFixed(2)}%
    </span>
  );
}

export default function PositionsTable({ positions, onDelete }: Props) {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        No positions yet. Add one above.
      </p>
    );
  }

  const colClass =
    "px-4 py-3 text-left text-xs font-display uppercase tracking-wide text-text-muted";
  const cellClass = "px-4 py-3 font-mono text-sm text-text-primary";

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead className="bg-surface-alt">
          <tr>
            <th className={colClass}>Ticker</th>
            <th className={`${colClass} text-right`}>Shares</th>
            <th className={`${colClass} text-right`}>Avg Cost</th>
            <th className={`${colClass} text-right`}>Current</th>
            <th className={`${colClass} text-right`}>Value</th>
            <th className={`${colClass} text-right`}>Gain/Loss</th>
            <th className={`${colClass} text-right`}>Return</th>
            <th className={`${colClass} text-right`}>Weight</th>
            <th className={colClass} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {positions.map((p) => (
            <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
              <td className={cellClass}>
                <span className="text-accent bg-accent-subtle border border-accent/20 px-2 py-0.5 rounded text-xs">
                  {p.ticker}
                </span>
              </td>
              <td className={`${cellClass} text-right`}>
                {p.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </td>
              <td className={`${cellClass} text-right`}>
                ${p.avg_cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className={`${cellClass} text-right`}>
                {p.current_price !== null ? (
                  `$${p.current_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  <Dash />
                )}
              </td>
              <td className={`${cellClass} text-right`}>
                {p.current_value !== null ? (
                  `$${p.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                ) : (
                  <Dash />
                )}
              </td>
              <td className={`${cellClass} text-right`}>
                <GainLoss value={p.gain_loss} />
              </td>
              <td className={`${cellClass} text-right`}>
                <ReturnPct value={p.return_pct} />
              </td>
              <td className={`${cellClass} text-right text-text-secondary`}>
                {p.weight !== null ? `${(p.weight * 100).toFixed(1)}%` : "—"}
              </td>
              <td className={`${cellClass} text-right`}>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-text-muted hover:text-red-400 transition-colors"
                  aria-label={`Remove ${p.ticker}`}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
