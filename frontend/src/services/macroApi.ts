import api from "./api";
import type { MacroSummary, MacroIndicator } from "../types/macro";

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
