import { Link, NavLink, useLocation } from "react-router-dom";
import { TrendingUp, Sun, Moon } from "lucide-react";
import TickerSearch from "../stock/TickerSearch";
import { useTheme } from "../../contexts/ThemeContext";

export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isPortfolio = location.pathname === "/portfolio";
  const { theme, toggleTheme } = useTheme();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium tracking-wide transition-colors ${
      isActive
        ? "text-accent border-b-2 border-accent pb-0.5"
        : "text-text-secondary hover:text-text-primary border-b-2 border-transparent pb-0.5"
    }`;

  return (
    <header className="bg-surface border-b border-border px-4 sm:px-6 py-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 h-12">
        <div className="flex items-center gap-5 shrink-0">
          <Link to="/" className="flex items-center gap-2 group">
            <TrendingUp size={18} className="text-accent" />
            <span className="font-display text-xl font-bold tracking-widest text-text-primary uppercase hidden sm:inline">
              StockLens
            </span>
          </Link>
          <nav className="flex items-center gap-4 h-12">
            <NavLink to="/" end className={navLinkClass}>
              Stocks
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/portfolio" className={navLinkClass}>
              Portfolio
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {!isHome && !isDashboard && !isPortfolio && <TickerSearch />}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors cursor-pointer"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
