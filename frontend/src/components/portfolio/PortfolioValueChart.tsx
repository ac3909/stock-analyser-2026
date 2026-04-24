import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PortfolioHistoryPoint } from "../../types/portfolio";

interface Props {
  data: PortfolioHistoryPoint[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatValue(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function PortfolioValueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 h-64 flex items-center justify-center text-sm text-text-muted">
        No history data
      </div>
    );
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const isUp = last >= first;
  const strokeColor = isUp ? "#4ade80" : "#f87171";

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="font-display text-sm uppercase tracking-wide text-text-secondary mb-4">
        Portfolio Value (1Y)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
            formatter={(v: number) => [
              `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
              "Portfolio Value",
            ]}
            labelFormatter={(label: string) =>
              new Date(label + "T00:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#portfolioGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
