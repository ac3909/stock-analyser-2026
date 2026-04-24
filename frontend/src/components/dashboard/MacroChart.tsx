import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Sparkles, Info, ExternalLink } from "lucide-react";
import type { MacroPricePoint, IndicatorSummary } from "../../types/macro";
import { formatDate } from "../../utils/chart";

/** Short descriptions of what each indicator measures. */
export const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  "^VIX": "Measures expected 30-day volatility of the S&P 500. Higher values indicate more fear and uncertainty in the market.",
  "^GSPC": "Tracks 500 of the largest US companies. Widely regarded as the best gauge of overall US stock market performance.",
  "^DJI": "Tracks 30 large, publicly-owned blue-chip companies trading on the NYSE and NASDAQ.",
  "^IXIC": "Tracks over 3,000 stocks listed on the NASDAQ exchange, heavily weighted toward technology companies.",
  "^TNX": "The yield on US 10-year government bonds. A key benchmark for mortgage rates and economic outlook.",
  "DX-Y.NYB": "Measures the value of the US dollar against a basket of major foreign currencies (EUR, JPY, GBP, CAD, SEK, CHF).",
  "GC=F": "The price of gold futures contracts. Gold is often seen as a safe-haven asset during economic uncertainty.",
  "CL=F": "The price of West Texas Intermediate crude oil futures. A key indicator of energy costs and global economic activity.",
};

/** Format a number compactly for the Y-axis. */
function formatAxisValue(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Info button with hover tooltip for indicator descriptions. */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/info relative">
      <button className="p-1 rounded-full text-text-muted hover:text-text-secondary hover:bg-surface-alt transition-colors cursor-default">
        <Info size={14} />
      </button>
      <div className="invisible opacity-0 group-hover/info:visible group-hover/info:opacity-100 transition-opacity duration-150 absolute z-[100] top-full right-0 mt-1 w-64 px-3 py-2 rounded-xl border border-border bg-surface shadow-lg text-xs text-text-secondary leading-relaxed pointer-events-none">
        {text}
      </div>
    </div>
  );
}

interface Props {
  symbol: string;
  name: string;
  currentValue: number | null;
  changePct: number | null;
  prices: MacroPricePoint[];
  summary?: IndicatorSummary;
  period: string;
}

/** Expandable AI summary footer shared across chart cards. */
export function SummaryFooter({ summary }: { summary: IndicatorSummary }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = summary.sources.length > 0;

  return (
    <div className="px-4 py-2.5 border-t border-border bg-surface-alt">
      <div className="flex gap-2">
        <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={`text-xs text-text-secondary leading-relaxed ${!expanded ? "line-clamp-1" : ""}`}>
            {summary.text}
          </p>
          {expanded && hasSources && (
            <div className="mt-2 space-y-1">
              {summary.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 truncate"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{src.title}</span>
                </a>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-500 hover:text-blue-400 mt-1 cursor-pointer"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Area chart card for a single macro indicator with AI summary. */
export default function MacroChart({
  symbol,
  name,
  currentValue,
  changePct,
  prices,
  summary,
  period,
}: Props) {
  const firstClose = prices[0]?.close ?? 0;
  const lastClose = prices[prices.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const color = isUp ? "#10b981" : "#ef4444";
  const gradientId = `macroGrad-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;
  const tickColor = "var(--text-muted)";
  const description = INDICATOR_DESCRIPTIONS[symbol];

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {currentValue != null && (
                <span className="text-sm font-mono font-semibold text-text-primary tabular-nums">
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
          {description && <InfoTooltip text={description} />}
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 px-2 py-2">
        {prices.length === 0 ? (
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
                    <div className="bg-surface border border-border text-text-primary text-xs rounded-xl px-3 py-2 shadow-xl">
                      <p className="text-text-muted mb-1">
                        {new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="font-mono font-semibold">{point.close?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
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

      {/* AI Summary */}
      <div className="mt-auto">
        {summary?.text && (
          <SummaryFooter summary={summary} />
        )}
      </div>
    </div>
  );
}
