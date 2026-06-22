"use client";

import { useEffect, useRef, useState } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import type { AgentSnapshot } from "@/lib/snapshot";
import { STRATEGY_META } from "@/lib/strategyMeta";

export function EquityCurveChart({ agents }: { agents: AgentSnapshot[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

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
          textColor: "#a8b3cf",
          fontFamily: "DM Mono, ui-monospace, monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(39,50,71,0.55)", style: LineStyle.Dotted },
          horzLines: { color: "rgba(39,50,71,0.55)", style: LineStyle.Dotted },
        },
        crosshair: {
          vertLine: {
            color: "rgba(139,92,246,0.6)",
            labelBackgroundColor: "#8b5cf6",
          },
          horzLine: {
            color: "rgba(6,182,212,0.5)",
            labelBackgroundColor: "#06b6d4",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(39,50,71,0.8)",
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: "rgba(39,50,71,0.8)",
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (ts: number) => `D-${ts}`,
        },
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
        handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
      });

      // Add one line series per agent using day index on the x-axis.
      // lightweight-charts requires unix timestamps; we map dayIndex → epoch seconds
      // starting from a fixed base so the x-axis is stable.
      const BASE_TS = 1748736000; // 2026-06-01 00:00:00 UTC in seconds
      const DAY_S = 86400;

      for (const snap of agents) {
        const meta = STRATEGY_META[snap.agent.strategyType];
        const series = chart.addLineSeries({
          color: snap.agent.color || meta.color,
          lineWidth: snap.agent.isReal ? 2 : 2,
          title: snap.agent.name,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 5,
          crosshairMarkerBorderColor: snap.agent.color || meta.color,
          crosshairMarkerBackgroundColor: "#0b0f19",
          lastValueVisible: true,
          priceLineVisible: false,
          // lineType: 0, // Solid (default)
        });

        const data = snap.curve.map((p) => ({
          time: (BASE_TS + p.dayIndex * DAY_S) as UTCTimestamp,
          value: p.equity,
        }));

        series.setData(data);
      }

      // Reference line at $10,000
      const refSeries = chart.addLineSeries({
        color: "rgba(255,255,255,0.12)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "$10k",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      refSeries.setData([
        { time: BASE_TS as UTCTimestamp, value: 10000 },
        {
          time: (BASE_TS + (agents[0]?.curve.length - 1) * DAY_S) as UTCTimestamp,
          value: 10000,
        },
      ]);

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (el && chart) {
          chart.applyOptions({ width: el.clientWidth });
        }
      });
      ro.observe(el);

      return () => ro.disconnect();
    }

    const cleanup = init();

    return () => {
      cleanup.then((fn) => fn?.());
      chart?.remove();
    };
  }, [mounted, agents]);

  return (
    <section className="glass-strong relative overflow-hidden rounded-xl3 shadow-hero">
      {/* ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-0 h-48 w-64 opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle,#06b6d4,transparent 65%)" }}
      />

      <header className="relative flex flex-wrap items-end justify-between gap-3 border-b border-line/60 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Performance History
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            Equity Curves
          </h2>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-3">
          {agents.map((snap) => (
            <div key={snap.agent.id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-5 rounded-full"
                style={{ background: snap.agent.color }}
              />
              <span className="text-[11px] font-medium text-ink">{snap.agent.name}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="relative px-0 py-0">
        {!mounted && (
          <div className="flex h-[360px] items-center justify-center text-muted text-sm">
            Loading chart…
          </div>
        )}
        <div
          ref={containerRef}
          className="h-[360px] w-full"
          aria-label="Equity curves for all agents over the season"
        />
      </div>

      <footer className="border-t border-line/40 px-5 py-3 text-[11px] text-muted sm:px-6">
        X-axis: day index from season start (D-0 = June 1, 2026). Y-axis: portfolio equity.
        Dashed line = $10,000 baseline. Thicker line = MINT (live agent).
      </footer>
    </section>
  );
}
