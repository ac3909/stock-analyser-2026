import { Building2, Globe, Users } from "lucide-react";
import type { CompanyProfile as CompanyProfileType, KeyRatios } from "../../types/stock";

/** Format large numbers into human-readable currency strings. */
function formatMarketCap(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

/** Format a number as USD currency. */
function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

interface Props {
  profile: CompanyProfileType;
  ratios?: KeyRatios | null;
}

/** Displays company overview: name, sector, market cap, 52-week range. */
export default function CompanyProfile({ profile, ratios }: Props) {
  const stats = [
    { label: "Market Cap", value: formatMarketCap(profile.market_cap) },
    { label: "52W High", value: formatPrice(ratios?.fifty_two_week_high ?? null) },
    { label: "52W Low", value: formatPrice(ratios?.fifty_two_week_low ?? null) },
    { label: "Beta", value: ratios?.beta != null ? ratios.beta.toFixed(2) : "—" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
            <span className="px-2.5 py-0.5 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg">
              {profile.symbol}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
            {profile.sector && (
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                {profile.sector}
                {profile.industry && ` · ${profile.industry}`}
              </span>
            )}
            {profile.country && (
              <span className="flex items-center gap-1.5">
                <Globe size={14} />
                {profile.country}
              </span>
            )}
            {profile.employees != null && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {profile.employees.toLocaleString()} employees
              </span>
            )}
          </div>
        </div>

        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline shrink-0"
          >
            {profile.website.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{stat.label}</p>
            <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {profile.description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {profile.description}
        </p>
      )}
    </div>
  );
}
