import api from "./api";
import type { MacroSummary, MacroIndicator, NewsArticle } from "../types/macro";

/** Fetch all macro indicators with Fear & Greed gauge. */
export async function getMacroIndicators(period = "6mo"): Promise<MacroSummary> {
  const { data } = await api.get<MacroSummary>("/api/macro/indicators", {
    params: { period },
  });
  return data;
}

/** Fetch a single macro indicator's history. */
export async function getMacroIndicator(symbol: string, period = "1y"): Promise<MacroIndicator> {
  const { data } = await api.get<MacroIndicator>(`/api/macro/indicator/${encodeURIComponent(symbol)}`, {
    params: { period },
  });
  return data;
}

/** Fetch all indicators with AI-generated news summaries. */
export async function getMacroSummaries(period = "6mo"): Promise<MacroSummary> {
  const { data } = await api.get<MacroSummary>("/api/macro/summaries", {
    params: { period },
  });
  return data;
}

/** Fetch top market news headlines. */
export async function getMarketNews(pageSize = 10): Promise<NewsArticle[]> {
  const { data } = await api.get<NewsArticle[]>("/api/news/headlines", {
    params: { page_size: pageSize },
  });
  return data;
}
