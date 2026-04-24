import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { PositionPerformance } from "../../types/portfolio";

interface Props {
  positions: PositionPerformance[];
}

const COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#6366f1",
];

export default function AllocationChart({ positions }: Props) {
  const total = positions.reduce((s, p) => s + (p.current_value ?? p.cost_basis), 0);
  if (total === 0) return null;

  const data = positions
    .map((p, i) => ({
      ticker: p.ticker,
      pct: Math.round(((p.current_value ?? p.cost_basis) / total) * 1000) / 10,
      color: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="font-display text-sm uppercase tracking-wide text-text-secondary mb-4">
        Allocation
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fontSize: 11, fill: "var(--text-primary)", fontFamily: "IBM Plex Mono" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
            formatter={(v: number) => [`${v}%`, "Allocation"]}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
