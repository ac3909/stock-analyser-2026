export const UNIT_OPTIONS = [
  { label: "Million", multiplier: 1e6 },
  { label: "Billion", multiplier: 1e9 },
  { label: "Trillion", multiplier: 1e12 },
];

/** Detect the best initial unit (multiplier) for a raw value. */
export function detectUnit(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1e12) return 1e12;
  if (abs >= 1e9) return 1e9;
  return 1e6;
}
