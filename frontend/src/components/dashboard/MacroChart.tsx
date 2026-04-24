import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { getMacroIndicator } from "../../services/macroApi";

const PERIODS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
] as const;

/** Format a date string for the X-axis. */
function formatDate(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (["1mo", "3mo"].includes(period)) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Format a number compactly for the Y-axis. */
function formatAxisValue(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface Props {
  symbol: string;
  name: string;
  initialValue?: number | null;
  initialChangePct?: number | null;
}

/** Area chart card for a single macro indicator with period selector. */
export default function MacroChart({ symbol, name, initialValue, initialChangePct }: Props) {
  const [period, setPeriod] = useState("6mo");

  const { data, isFetching } = useQuery({
    queryKey: ["macroIndicator", symbol, period],
    queryFn: () => getMacroIndicator(symbol, period),
    staleTime: 5 * 60 * 1000,
  });

  const prices = data?.prices ?? [];
  const currentValue = data?.current_value ?? initialValue ?? null;
  const changePct = data?.change_pct ?? initialChangePct ?? null;

  const firstClose = prices[0]?.close ?? 0;
  const lastClose = prices[prices.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const color = isUp ? "#10b981" : "#ef4444";
  const gradientId = `macroGrad-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;
  const tickColor = "var(--text-muted)";

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {currentValue != null && (
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
              {changePct != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                    changePct >= 0
                      ? "bg-positive-subtle text-emerald-600"
                      : "bg-negative-subtle text-red-600"
                  }`}
                >
                  {changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-0.5 bg-surface-alt rounded-lg p-0.5 shrink-0">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  period === p.value
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 px-2 py-2">
        {isFetching && prices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : prices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-muted">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prices} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d, period)}
                tick={{ fontSize: 10, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={formatAxisValue}
                tick={{ fontSize: 10, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-gray-400 mb-0.5">
                        {new Date(point.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="font-semibold">{point.close?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
