"use client";

import type { PriceSource } from "@/lib/live/types";

function sourceLabel(source: PriceSource): string {
  switch (source) {
    case "binance":
      return "Binance";
    case "coingecko":
      return "CoinGecko";
    default:
      return "";
  }
}

/**
 * 실시세 소스 상태 배지. design/design.md 모션 규격: 작은 상태 점에 절제된 2초 펄스.
 */
export function LivePriceBadge({ source }: { source: PriceSource }) {
  const isLive = source !== "simulated";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        isLive
          ? "border-good/40 bg-good/10 text-good"
          : "border-warn/40 bg-warn/10 text-warn"
      }`}
      role="status"
      aria-label={isLive ? `실시간 시세 · ${sourceLabel(source)}` : "시뮬레이션 시세"}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          isLive ? "animate-pulseGlow bg-good" : "bg-warn"
        }`}
      />
      {isLive ? `LIVE · ${sourceLabel(source)}` : "시뮬레이션"}
    </span>
  );
}
