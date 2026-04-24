/** Format a date string for the X-axis based on the selected period. */
export function formatDate(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (["1mo", "3mo"].includes(period)) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (["5y", "10y", "max"].includes(period)) {
    return d.toLocaleDateString("en-US", { year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
