import { Link, NavLink, useLocation } from "react-router-dom";
import { TrendingUp, Sun, Moon } from "lucide-react";
import TickerSearch from "../stock/TickerSearch";
import { useTheme } from "../../contexts/ThemeContext";

/** App header with logo, navigation, inline search bar, and theme toggle. */
export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const { theme, toggleTheme } = useTheme();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-text-primary font-semibold" : "text-text-secondary hover:text-text-primary"
    }`;

  return (
    <header className="bg-surface border-b border-border px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <TrendingUp size={22} className="text-blue-600" />
            <span className="text-lg font-bold text-text-primary hidden sm:inline">
              StockLens
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <NavLink to="/" end className={navLinkClass}>
              Stocks
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {!isHome && !isDashboard && <TickerSearch />}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors cursor-pointer"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
