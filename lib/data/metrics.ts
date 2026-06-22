import type { EquityPoint, LeaderboardMetric } from "@/lib/types/domain";

/** Daily simple returns from an equity curve. */
export function dailyReturns(curve: EquityPoint[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].equity;
    if (prev > 0) r.push(curve[i].equity / prev - 1);
  }
  return r;
}

/** Annualized Sharpe (rf = 0), 252 trading days. */
export function computeSharpe(curve: EquityPoint[]): number {
  const r = dailyReturns(curve);
  if (r.length < 2) return 0;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance =
    r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  return (mean / sd) * Math.sqrt(252);
}

/** Max drawdown as a positive fraction (0.18 == 18%). */
export function computeMaxDrawdown(curve: EquityPoint[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = (peak - p.equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

export function computeRoiPct(curve: EquityPoint[], initialCapital: number): number {
  if (curve.length === 0) return 0;
  const last = curve[curve.length - 1].equity;
  return ((last - initialCapital) / initialCapital) * 100;
}

/** Annualized volatility (for differentiation checks / display). */
export function computeAnnualizedVol(curve: EquityPoint[]): number {
  const r = dailyReturns(curve);
  if (r.length < 2) return 0;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/**
 * Normalize a metric to a 0..1 race position across the cohort.
 * Higher = better runner. maxDrawdown is inverted (less DD = better).
 */
export function normalizeRacePositions(
  values: number[],
  metric: LeaderboardMetric
): number[] {
  const oriented =
    metric === "maxDrawdown" ? values.map((v) => -v) : values.slice();
  const min = Math.min(...oriented);
  const max = Math.max(...oriented);
  const span = max - min || 1;
  // Keep runners off the extreme rails for visual breathing room.
  return oriented.map((v) => 0.08 + 0.84 * ((v - min) / span));
}
