import { TrendingUp } from "lucide-react";
import TickerSearch from "../components/stock/TickerSearch";

/** Landing page with a prominent centred search bar for finding stocks. */
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="flex items-center gap-3 mb-3">
        <TrendingUp size={36} className="text-blue-600" />
        <h2 className="text-4xl font-bold text-gray-900">Stock Analysis Tool</h2>
      </div>
      <p className="text-gray-500 mb-10 text-lg">
        Search for a US stock to view financials, ratios, and price history.
      </p>
      <TickerSearch large />
    </div>
  );
}
