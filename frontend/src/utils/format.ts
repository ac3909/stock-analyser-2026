/** Get the short unit suffix for a large number (B, M, K, T). */
export function getUnitSuffix(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return "T";
  if (abs >= 1e9) return "B";
  if (abs >= 1e6) return "M";
  if (abs >= 1e3) return "K";
  return "";
}

/** Format large numbers with $ and B/M/K suffix (e.g. "$142.50B"). */
export function fmtVal(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Format large numbers with $ but without suffix (e.g. "$142.50"). */
export function fmtValNoUnit(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

const UNIT_WORDS: Record<string, string> = {
  T: "Trillion",
  B: "Billion",
  M: "Million",
  K: "Thousand",
};

/** Format large numbers with $ and full unit word (e.g. "$201.53 Billion"). */
export function fmtValFull(v: number): string {
  const suffix = getUnitSuffix(v);
  const numStr = fmtValNoUnit(v);
  if (!suffix) return numStr;
  return `${numStr} ${UNIT_WORDS[suffix] ?? suffix}`;
}
