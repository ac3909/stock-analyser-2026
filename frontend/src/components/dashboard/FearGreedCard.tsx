import { Activity } from "lucide-react";

const SENTIMENT_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  "Extreme Fear": { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600", bar: "bg-red-500" },
  "Fear": { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600", bar: "bg-orange-500" },
  "Neutral": { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-600", bar: "bg-yellow-500" },
  "Greed": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600", bar: "bg-emerald-500" },
  "Extreme Greed": { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600", bar: "bg-green-500" },
};

/** Map VIX to a 0–100 gauge position (inverted: low VIX = high greed). */
function vixToGaugePosition(vix: number): number {
  // VIX 10 → 100 (extreme greed), VIX 40 → 0 (extreme fear)
  const clamped = Math.max(10, Math.min(40, vix));
  return Math.round(((40 - clamped) / 30) * 100);
}

interface Props {
  label: string;
  vix: number | null;
}

/** Wide card showing VIX-based Fear & Greed sentiment indicator. */
export default function FearGreedCard({ label, vix }: Props) {
  const style = SENTIMENT_STYLES[label] ?? SENTIMENT_STYLES["Neutral"];
  const gaugePos = vix != null ? vixToGaugePosition(vix) : 50;

  return (
    <div className={`rounded-2xl border border-border p-5 ${style.bg}`}>
      <div className="flex items-center gap-3 mb-3">
        <Activity size={20} className={style.text} />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Fear & Greed Index
        </h3>
        <span className="text-xs text-text-muted ml-auto">Based on VIX</span>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className={`text-2xl font-bold ${style.text}`}>{label}</p>
          {vix != null && (
            <p className="text-sm text-text-secondary mt-0.5">VIX: {vix.toFixed(2)}</p>
          )}
        </div>

        {/* Gauge bar */}
        <div className="flex-1 max-w-xs">
          <div className="relative h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-400 overflow-hidden">
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
  );
}
