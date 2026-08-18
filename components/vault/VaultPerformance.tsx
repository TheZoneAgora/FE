"use client";

import { useEffect, useRef, useState } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import type { VaultState } from "@/lib/vault/types";
import { getPriceFeed } from "@/lib/live/PriceFeed";
import { bigintToDisplayNumber } from "@/components/vault/format";

const MAX_POINTS = 240;

interface EquityPoint {
  ts: number;
  equity: number;
}

/**
 * 볼트 총자산(USDC 환산) 추이를 실시세 틱마다 샘플링해 그리는 간단한 라이브 곡선.
 * 온체인/mock 소스 어느 쪽도 시계열을 보관하지 않으므로, 세션 동안 이 컴포넌트가 직접 축적한다.
 */
export function VaultPerformance({ vault }: { vault: VaultState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef(vault);
  const [mounted, setMounted] = useState(false);
  const [points, setPoints] = useState<EquityPoint[]>([]);

  useEffect(() => {
    vaultRef.current = vault;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function appendFromPrice(priceSui: number | undefined) {
      if (typeof priceSui !== "number" || !Number.isFinite(priceSui)) return;
      const v = vaultRef.current;
      const fiat = bigintToDisplayNumber(v.fiatBalance, 6);
      const crypto = bigintToDisplayNumber(v.cryptoBalance, 9);
      const equity = fiat + crypto * priceSui;
      setPoints((prev) => {
        const next = [...prev, { ts: Date.now(), equity }];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      });
    }

    const feed = getPriceFeed();
    appendFromPrice(feed.getSnapshot().prices.SUIUSDT);
    return feed.subscribe((tick) => appendFromPrice(tick.prices.SUIUSDT));
  }, []);

  const first = points[0]?.equity ?? 0;
  const last = points[points.length - 1]?.equity ?? 0;
  const delta = last - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;
  const positive = delta >= 0;

  useEffect(() => {
    if (!mounted || !containerRef.current || points.length < 2) return;
    let chart: ReturnType<typeof import("lightweight-charts")["createChart"]> | null = null;

    async function init() {
      const { createChart, ColorType, LineStyle } = await import("lightweight-charts");
      const el = containerRef.current;
      if (!el) return;

      chart = createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#B9B0A5",
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)", style: LineStyle.Dotted },
          horzLines: { color: "rgba(255,255,255,0.06)", style: LineStyle.Dotted },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
          scaleMargins: { top: 0.12, bottom: 0.12 },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
        handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
      });

      const series = chart.addAreaSeries({
        lineColor: positive ? "#24C77A" : "#F04F5F",
        topColor: positive ? "rgba(36,199,122,0.28)" : "rgba(240,79,95,0.28)",
        bottomColor: "rgba(17,16,15,0)",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        points.map((p) => ({ time: Math.floor(p.ts / 1000) as UTCTimestamp, value: p.equity }))
      );
      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el && chart) chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
      chart?.remove();
    };
  }, [mounted, points, positive]);

  return (
    <section className="rounded-3xl border border-white/10 bg-surface-dark p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-light">
            볼트 성과
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular-nums font-display text-2xl font-bold text-warm-ivory">
              {last.toFixed(2)} USDC
            </span>
            {points.length >= 2 && (
              <span
                className={`tabular-nums text-[13px] font-semibold ${
                  positive ? "text-positive" : "text-negative"
                }`}
              >
                {positive ? "+" : ""}
                {delta.toFixed(2)} ({positive ? "+" : ""}
                {deltaPct.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="relative mt-4 h-[220px] w-full">
        {points.length < 2 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-light">
            실시간 데이터 수집 중…
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" aria-label="볼트 순자산 추이" />
        )}
      </div>
    </section>
  );
}
