"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { AgentSnapshot } from "@/lib/types/snapshot";
import { STRATEGY_META } from "@/lib/strategyMeta";

// lightweight-charts requires unix timestamps; we map dayIndex → epoch seconds
// starting from a fixed base so the x-axis is stable.
const BASE_TS = 1748736000; // 2026-06-01 00:00:00 UTC in seconds
const DAY_S = 86400;
const REF_SERIES_KEY = "__ref__";

export function EquityCurveChart({ agents }: { agents: AgentSnapshot[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const hasFitRef = useRef(false);
  const [chartReady, setChartReady] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create the chart once. Data is applied separately so live ticks update
  // series in place instead of tearing down the whole chart (no zoom/pan reset).
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    let disposed = false;
    let ro: ResizeObserver | null = null;
    // useRef 초기값 Map은 재할당되지 않으므로 cleanup용으로 미리 캡처해 둔다.
    const series = seriesRef.current;

    async function init() {
      const { createChart, ColorType, LineStyle } = await import("lightweight-charts");
      const el = containerRef.current;
      if (!el || disposed) return;

      const chart = createChart(el, {
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

      const refSeries = chart.addLineSeries({
        color: "rgba(255,255,255,0.12)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "$10k",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      series.set(REF_SERIES_KEY, refSeries);

      chartRef.current = chart;
      setChartReady((n) => n + 1);

      ro = new ResizeObserver(() => {
        if (el && chartRef.current) {
          chartRef.current.applyOptions({ width: el.clientWidth });
        }
      });
      ro.observe(el);
    }

    void init();

    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      series.clear();
      hasFitRef.current = false;
    };
  }, [mounted]);

  // Apply/update series data whenever the (possibly live-merged) agent
  // snapshots change — creates series lazily, otherwise just calls setData.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const snap of agents) {
      const meta = STRATEGY_META[snap.agent.strategyType];
      let series = seriesRef.current.get(snap.agent.id);
      if (!series) {
        series = chart.addLineSeries({
          color: snap.agent.color || meta.color,
          lineWidth: 2,
          title: snap.agent.name,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 5,
          crosshairMarkerBorderColor: snap.agent.color || meta.color,
          crosshairMarkerBackgroundColor: "#0b0f19",
          lastValueVisible: true,
          priceLineVisible: false,
        });
        seriesRef.current.set(snap.agent.id, series);
      }
      series.setData(
        snap.curve.map((p) => ({
          time: (BASE_TS + p.dayIndex * DAY_S) as UTCTimestamp,
          value: p.equity,
        }))
      );
    }

    const refSeries = seriesRef.current.get(REF_SERIES_KEY);
    const longestCurveLength = Math.max(0, ...agents.map((a) => a.curve.length));
    if (refSeries && longestCurveLength > 0) {
      refSeries.setData([
        { time: BASE_TS as UTCTimestamp, value: 10000 },
        {
          time: (BASE_TS + (longestCurveLength - 1) * DAY_S) as UTCTimestamp,
          value: 10000,
        },
      ]);
    }

    if (!hasFitRef.current) {
      chart.timeScale().fitContent();
      hasFitRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, chartReady]);

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
            성과 히스토리
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            자산 곡선
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
            차트 불러오는 중…
          </div>
        )}
        <div
          ref={containerRef}
          className="h-[360px] w-full"
          aria-label="시즌 전체 에이전트 자산 곡선"
        />
      </div>

      <footer className="border-t border-line/40 px-5 py-3 text-[11px] text-muted sm:px-6">
        가로축: 시즌 시작일 기준 경과일(D-0 = 2026년 6월 1일). 세로축: 포트폴리오 자산.
        점선 = $10,000 기준선. 굵은 선 = MINT(실거래 데이터). 각 곡선의 끝부분은
        실시간 시세 틱으로 계속 연장됩니다.
      </footer>
    </section>
  );
}
