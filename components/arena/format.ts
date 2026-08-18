// design/agora-arena.html의 fmt()/fmtUsd() 포팅.

export function fmtPct(n: number, d = 1): string {
  return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(d) + "%";
}

export function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}
