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
import { Loader2 } from "lucide-react";
import { getHistoricalPrices } from "../../services/stockApi";

const PERIODS = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
] as const;

/** Format a date string for the X-axis based on the selected period. */
function formatDate(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (["1mo", "3mo"].includes(period)) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (["6mo", "1y"].includes(period)) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Format a number as a USD price for the Y-axis. */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  ticker: string;
}

/** Historical price area chart with selectable time periods. */
export default function PriceChart({ ticker }: Props) {
  const [period, setPeriod] = useState("1y");

  const { data, isFetching } = useQuery({
    queryKey: ["prices", ticker, period],
    queryFn: () => getHistoricalPrices(ticker, period),
  });

  const prices = data?.prices ?? [];

  // Determine if stock is up or down over the period
  const firstClose = prices[0]?.close ?? 0;
  const lastClose = prices[prices.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const color = isUp ? "#10b981" : "#ef4444";

  // Read the CSS variable for axis tick color
  const tickColor = "var(--text-muted)";

  return (
    <div>
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-text-primary">Price History</h3>
        <div className="flex gap-1 bg-surface-alt rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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

      {/* Chart */}
      <div className="h-48 sm:h-56">
        {isFetching && prices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : prices.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-text-muted">
            No price data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prices} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d, period)}
                tick={{ fontSize: 11, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                width={60}
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
                      <p className="font-semibold">${point.close?.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
