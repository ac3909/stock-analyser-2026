import { Activity } from "lucide-react";
import { SummaryFooter, InfoTooltip, INDICATOR_DESCRIPTIONS } from "./MacroChart";
import { formatDate } from "../../utils/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MacroPricePoint, IndicatorSummary } from "../../types/macro";

const SENTIMENT_STYLES: Record<string, { bg: string; text: string }> = {
  "Extreme Fear": { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600" },
  "Fear": { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600" },
  "Neutral": { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-600" },
  "Greed": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600" },
  "Extreme Greed": { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600" },
};

/** Map VIX to a 0-100 gauge position (inverted: low VIX = high greed). */
function vixToGaugePosition(vix: number): number {
  const clamped = Math.max(10, Math.min(40, vix));
  return Math.round(((40 - clamped) / 30) * 100);
}

interface Props {
  label: string;
  vix: number | null;
  vixPrices?: MacroPricePoint[];
  summary?: IndicatorSummary;
  period: string;
}

/** Fear & Greed card with gauge and VIX time series chart. */
export default function FearGreedCard({ label, vix, vixPrices = [], summary, period }: Props) {
  const style = SENTIMENT_STYLES[label] ?? SENTIMENT_STYLES["Neutral"];
  const gaugePos = vix != null ? vixToGaugePosition(vix) : 50;
  const tickColor = "var(--text-muted)";

  return (
    <div className={`rounded-2xl border border-border overflow-hidden flex flex-col ${style.bg}`}>
      {/* Gauge section */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Activity size={18} className={style.text} />
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Fear & Greed
          </h3>
          <span className="text-xs text-text-muted ml-auto">VIX-based</span>
          {INDICATOR_DESCRIPTIONS["^VIX"] && <InfoTooltip text={INDICATOR_DESCRIPTIONS["^VIX"]} />}
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className={`text-xl font-bold ${style.text}`}>{label}</p>
            {vix != null && (
              <p className="text-sm text-text-secondary mt-0.5">VIX: {vix.toFixed(2)}</p>
            )}
          </div>

          <div className="flex-1">
            <div className="relative h-2.5 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-400 overflow-hidden">
              <div
                className="absolute top-0 h-full w-1 bg-white border border-gray-400 rounded-full shadow"
                style={{ left: `${gaugePos}%`, transform: "translateX(-50%)" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-text-muted">
              <span>Fear</span>
              <span>Greed</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIX time series chart */}
      {vixPrices.length > 0 && (
        <div className="h-32 px-2 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={vixPrices} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="vixGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
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
                tick={{ fontSize: 10, fill: tickColor }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <ReferenceLine y={20} stroke="var(--border-color)" strokeDasharray="3 3" />
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
                      <p className="font-semibold">VIX: {point.close?.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#vixGradient)"
                dot={false}
                activeDot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Summary */}
      <div className="mt-auto">
        {summary?.text && <SummaryFooter summary={summary} />}
      </div>
    </div>
  );
}
