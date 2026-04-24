import { useState } from "react";
import { Upload } from "lucide-react";
import { addPosition } from "../../services/portfolioApi";

interface Props {
  portfolioId: string;
  onPositionAdded: () => void;
}

function parsePortfolioCsv(
  text: string
): Array<{ ticker: string; shares: number; avg_cost: number }> {
  const lines = text.trim().split("\n");
  const start = lines[0].toLowerCase().includes("ticker") ? 1 : 0;
  const results: Array<{ ticker: string; shares: number; avg_cost: number }> = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < 3) continue;
    const [ticker, sharesStr, avgCostStr] = parts;
    const shares = parseFloat(sharesStr);
    const avg_cost = parseFloat(avgCostStr);
    if (!ticker || isNaN(shares) || isNaN(avg_cost)) continue;
    results.push({ ticker: ticker.toUpperCase(), shares, avg_cost });
  }
  return results;
}

export default function PortfolioBuilder({ portfolioId, onPositionAdded }: Props) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  const inputClass =
    "bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40";

  const handleAdd = async () => {
    setError(null);
    if (!ticker || !shares || !avgCost) {
      setError("All fields required");
      return;
    }
    const s = parseFloat(shares);
    const c = parseFloat(avgCost);
    if (isNaN(s) || isNaN(c) || s <= 0 || c <= 0) {
      setError("Shares and avg cost must be positive numbers");
      return;
    }
    setIsAdding(true);
    try {
      await addPosition(portfolioId, ticker.toUpperCase(), s, c);
      setTicker("");
      setShares("");
      setAvgCost("");
      onPositionAdded();
    } catch {
      setError("Failed to add position");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvStatus(null);
    setError(null);
    const text = await file.text();
    const rows = parsePortfolioCsv(text);
    if (rows.length === 0) {
      setCsvStatus("No valid rows found. Expected format: ticker,shares,avg_cost");
      e.target.value = "";
      return;
    }
    setCsvStatus(`Importing ${rows.length} position(s)…`);
    let success = 0;
    for (const row of rows) {
      try {
        await addPosition(portfolioId, row.ticker, row.shares, row.avg_cost);
        success++;
      } catch {
        // continue on individual row failures
      }
    }
    setCsvStatus(`Imported ${success}/${rows.length} position(s)`);
    onPositionAdded();
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-display uppercase tracking-wide">
            Ticker
          </label>
          <input
            className={`${inputClass} w-24 uppercase`}
            placeholder="AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-display uppercase tracking-wide">
            Shares
          </label>
          <input
            className={`${inputClass} w-28`}
            placeholder="10"
            type="number"
            min="0"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-display uppercase tracking-wide">
            Avg Cost ($)
          </label>
          <input
            className={`${inputClass} w-32`}
            placeholder="150.00"
            type="number"
            min="0"
            step="0.01"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="px-4 py-2 bg-accent text-white text-sm font-display uppercase tracking-wide rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isAdding ? "Adding…" : "Add Position"}
        </button>
        <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-display uppercase tracking-wide text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors cursor-pointer">
          <Upload size={14} />
          Import CSV
          <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {csvStatus && <p className="text-xs text-text-muted">{csvStatus}</p>}
      <p className="text-xs text-text-muted">
        CSV format: <span className="font-mono">ticker,shares,avg_cost</span> (header row optional)
      </p>
    </div>
  );
}
