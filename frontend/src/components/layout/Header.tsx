import { Link, useLocation } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import TickerSearch from "../stock/TickerSearch";

/** App header with logo and inline search bar (hidden on the home page). */
export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <TrendingUp size={22} className="text-blue-600" />
          <span className="text-lg font-bold text-gray-900 hidden sm:inline">
            StockLens
          </span>
        </Link>
        {!isHome && <TickerSearch />}
      </div>
    </header>
  );
}
