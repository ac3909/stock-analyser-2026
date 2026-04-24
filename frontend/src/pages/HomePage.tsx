import { TrendingUp } from "lucide-react";
import TickerSearch from "../components/stock/TickerSearch";

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center justify-center py-20 sm:py-32 px-4 overflow-hidden">
      {/* Atmospheric grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      {/* Radial fade — masks grid at edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, var(--surface-alt) 75%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent-subtle border border-border">
            <TrendingUp size={28} className="text-accent" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-widest text-text-primary uppercase">
            StockLens
          </h1>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-12 bg-border" />
          <p className="text-xs font-mono font-medium tracking-widest text-text-muted uppercase">
            US Equity Analysis
          </p>
          <div className="h-px w-12 bg-border" />
        </div>

        <p className="text-text-secondary mb-10 text-sm sm:text-base text-center max-w-xs leading-relaxed">
          Financials, ratios, price history, and AI-powered analysis for US stocks.
        </p>

        <TickerSearch large />
      </div>
    </div>
  );
}
