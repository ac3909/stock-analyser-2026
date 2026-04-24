interface Props {
  indicators: { symbol: string; name: string }[];
  visible: Set<string>;
  onToggle: (symbol: string) => void;
}

/** Row of pill buttons to toggle visibility of individual indicators. */
export default function IndicatorToggle({ indicators, visible, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {indicators.map((ind) => {
        const active = visible.has(ind.symbol);
        return (
          <button
            key={ind.symbol}
            onClick={() => onToggle(ind.symbol)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-surface text-text-secondary border-border hover:border-text-muted"
            }`}
          >
            {ind.name}
          </button>
        );
      })}
    </div>
  );
}
