import { useState, useRef, useCallback } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { INDICATOR_DESCRIPTIONS } from "./MacroChart";

interface Props {
  indicators: { symbol: string; name: string }[];
  visible: Set<string>;
  onToggle: (symbol: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

/** Info icon inside a pill that shows a tooltip after a brief hover delay. */
function PillInfo({ symbol, active }: { symbol: string; active: boolean }) {
  const description = INDICATOR_DESCRIPTIONS[symbol];
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setShow(true), 400);
  }, []);

  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  }, []);

  if (!description) return null;

  return (
    <span
      className="relative ml-1 inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Info
        size={11}
        className={active ? "text-accent/60" : "text-text-muted"}
      />
      {show && (
        <div className="absolute z-[100] top-full left-1/2 -translate-x-1/2 mt-2 w-64 px-3 py-2 rounded-xl border border-border bg-surface shadow-lg text-xs text-text-secondary leading-relaxed pointer-events-none">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-[6px] border-transparent border-b-border" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-surface" />
          {description}
        </div>
      )}
    </span>
  );
}

/** Row of pill buttons to toggle visibility of individual indicators. */
export default function IndicatorToggle({ indicators, visible, onToggle, onSelectAll, onDeselectAll }: Props) {
  const allSelected = indicators.every((ind) => visible.has(ind.symbol));
  const noneSelected = indicators.every((ind) => !visible.has(ind.symbol));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted">Click to show/hide charts:</p>
        <div className="flex gap-1.5">
          <button
            onClick={onSelectAll}
            disabled={allSelected}
            className="px-3 py-1.5 text-xs font-medium bg-surface text-text-primary border border-border hover:bg-surface-alt disabled:opacity-40 disabled:cursor-default cursor-pointer flex items-center gap-1.5 rounded-md transition-colors"
          >
            <Eye size={13} />
            All
          </button>
          <button
            onClick={onDeselectAll}
            disabled={noneSelected}
            className="px-3 py-1.5 text-xs font-medium bg-surface text-text-primary border border-border hover:bg-surface-alt disabled:opacity-40 disabled:cursor-default cursor-pointer flex items-center gap-1.5 rounded-md transition-colors"
          >
            <EyeOff size={13} />
            None
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {indicators.map((ind) => {
          const active = visible.has(ind.symbol);
          return (
            <button
              key={ind.symbol}
              onClick={() => onToggle(ind.symbol)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer inline-flex items-center ${
                active
                  ? "bg-accent-subtle text-accent border-accent"
                  : "bg-surface text-text-secondary border-border hover:border-text-muted"
              }`}
            >
              {ind.name}
              <PillInfo symbol={ind.symbol} active={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
