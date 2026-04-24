import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { searchTickers } from "../../services/stockApi";

/** Search input with debounced autocomplete dropdown for finding stock tickers. */
export default function TickerSearch({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce the search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results when the debounced query changes
  const { data, isFetching } = useQuery({
    queryKey: ["tickerSearch", debouncedQuery],
    queryFn: () => searchTickers(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });

  const results = data?.results ?? [];
  const showDropdown = open && debouncedQuery.length > 0;

  // Close dropdown when clicking outside
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
      setQuery("");
      setOpen(false);
      navigate(`/stock/${symbol}`);
    },
    [navigate]
  );

  const inputSize = large
    ? "px-5 py-4 text-lg"
    : "px-4 py-2.5 text-sm";

  const iconSize = large ? 22 : 18;

  return (
    <div ref={wrapperRef} className={`relative ${large ? "w-full max-w-xl" : "w-80"}`}>
      {/* Search input */}
      <div className="relative">
        <Search
          size={iconSize}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search stocks (e.g. AAPL, Tesla)"
          className={`w-full ${inputSize} pl-11 bg-surface border border-border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            placeholder:text-text-muted text-text-primary shadow-sm`}
        />
        {isFetching && (
          <Loader2
            size={iconSize}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted animate-spin"
          />
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1.5 w-full bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
          {isFetching && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-text-muted text-center">
              No stocks found
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={result.symbol}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result.symbol)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                      hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-text-primary min-w-[4.5rem]">
                      {result.symbol}
                    </span>
                    <span className="text-sm text-text-secondary truncate">
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
