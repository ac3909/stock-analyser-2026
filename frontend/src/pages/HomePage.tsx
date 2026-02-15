import { TrendingUp } from "lucide-react";
import TickerSearch from "../components/stock/TickerSearch";

/** Landing page with a prominent centred search bar for finding stocks. */
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <TrendingUp size={32} className="text-blue-600 sm:w-9 sm:h-9" />
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">StockLens</h2>
      </div>
      <p className="text-gray-500 mb-8 sm:mb-10 text-base sm:text-lg text-center max-w-md">
        Search for a US stock to view financials, ratios, and price history.
      </p>
      <TickerSearch large />
    </div>
  );
}
