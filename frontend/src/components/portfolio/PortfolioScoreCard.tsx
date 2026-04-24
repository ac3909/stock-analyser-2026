import { Sparkles, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import type { PortfolioScore } from "../../types/portfolio";

function FactorBar({
  label,
  score,
  commentary,
}: {
  label: string;
  score: number;
  commentary: string;
}) {
  const color =
    score >= 70 ? "bg-green-400" : score >= 45 ? "bg-accent" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="w-20 text-xs font-display uppercase tracking-wide text-text-secondary shrink-0">
          {label}
        </span>
        <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="w-14 text-right font-mono text-xs text-text-primary shrink-0">
          {score}/100
        </span>
      </div>
      {commentary && (
        <p className="text-xs text-text-muted pl-[5.5rem] leading-relaxed">{commentary}</p>
      )}
    </div>
  );
}

function gradeColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 55) return "text-accent";
  return "text-red-400";
}

export default function PortfolioScoreCard({ score }: { score: PortfolioScore }) {
  const { factor_scores, factor_commentary } = score;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase tracking-wide text-text-primary">
          Portfolio Score
        </h2>
        <Sparkles size={16} className="text-accent" />
      </div>

      <div className="flex items-baseline gap-4">
        <span className={`font-display text-6xl font-bold ${gradeColor(score.overall_score)}`}>
          {score.grade}
        </span>
        <span className="font-mono text-3xl text-text-secondary">{score.overall_score}/100</span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-accent/40 pl-3">
        {score.thesis}
      </p>

      <div className="space-y-3">
        <h3 className="font-display text-xs uppercase tracking-wide text-text-muted">
          Factor Breakdown
        </h3>
        <FactorBar label="Value" score={factor_scores.value} commentary={factor_commentary.value} />
        <FactorBar label="Quality" score={factor_scores.quality} commentary={factor_commentary.quality} />
        <FactorBar label="Growth" score={factor_scores.growth} commentary={factor_commentary.growth} />
        <FactorBar label="Momentum" score={factor_scores.momentum} commentary={factor_commentary.momentum} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <h3 className="font-display text-xs uppercase tracking-wide text-text-muted mb-2">
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {score.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary">
                <TrendingUp size={12} className="text-green-400 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-display text-xs uppercase tracking-wide text-text-muted mb-2">
            Risks
          </h3>
          <ul className="space-y-1.5">
            {score.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary">
                <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {score.recommendations.length > 0 && (
        <div>
          <h3 className="font-display text-xs uppercase tracking-wide text-text-muted mb-2">
            Recommendations
          </h3>
          <ul className="space-y-1.5">
            {score.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary">
                <ChevronRight size={12} className="text-accent mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Generated {new Date(score.generated_at).toLocaleString()} · refreshes every 10 min
      </p>
    </div>
  );
}
