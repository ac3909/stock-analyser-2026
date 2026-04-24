import { Newspaper, ExternalLink } from "lucide-react";
import type { NewsArticle } from "../../types/macro";

/** Format a UTC date string into a relative time label (e.g. "2h ago"). */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  articles: NewsArticle[];
}

/** Vertical list of market news headlines with source attribution. */
export default function NewsFeed({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3 mb-3">
          <Newspaper size={20} className="text-text-muted" />
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Market News
          </h3>
        </div>
        <p className="text-sm text-text-muted text-center py-6">
          No headlines available. Check that NEWSAPI_KEY is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3 mb-4">
        <Newspaper size={20} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Market News
        </h3>
      </div>

      <ul className="space-y-3">
        {articles.map((article, idx) => (
          <li key={idx}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-border hover:border-blue-500/40 bg-surface-alt p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-500">{article.source}</span>
                    <span className="text-xs text-text-muted">{timeAgo(article.published_at)}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary leading-snug group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h4>
                  {article.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                </div>
                <ExternalLink size={14} className="text-text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
