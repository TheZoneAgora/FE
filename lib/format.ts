export function fmtUsd(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number, withSign = true): string {
  const s = `${n >= 0 && withSign ? "+" : ""}${n.toFixed(2)}%`;
  return s;
}

export function fmtNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export function fmtPctFrac(frac: number): string {
  return `${(frac * 100).toFixed(1)}%`;
}
