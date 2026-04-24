import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Plus } from "lucide-react";
import { searchTickers } from "../../services/stockApi";

interface Props {
  onAdd: (ticker: string) => void;
  exclude: string[];
}

/** Ticker search adapted for adding comparable companies. */
export default function CompTickerSearch({ onAdd, exclude }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["tickerSearch", debouncedQuery],
    queryFn: () => searchTickers(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });

  const results = (data?.results ?? []).filter(
    (r) => !exclude.includes(r.symbol)
  );
  const showDropdown = open && debouncedQuery.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (symbol: string) => {
      onAdd(symbol);
      setQuery("");
      setOpen(false);
    },
    [onAdd]
  );

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Add a comparable (e.g. MSFT)"
          className="w-full px-3 py-2 pl-9 text-sm bg-surface-alt border border-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-text-muted text-text-primary"
        />
        {isFetching && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
          {isFetching && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-text-muted text-center">
              No results found
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={result.symbol}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result.symbol)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left
                      hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    <Plus size={14} className="text-blue-500 shrink-0" />
                    <span className="font-semibold text-text-primary text-sm min-w-[4rem]">
                      {result.symbol}
                    </span>
                    <span className="text-xs text-text-secondary truncate">
                      {result.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
