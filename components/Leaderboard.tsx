"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LeaderboardMetric } from "@/lib/types/domain";
import type { AgentSnapshot } from "@/lib/types/snapshot";
import { computeLeaderboard } from "@/lib/leaderboard";
import { AGENTS } from "@/lib/data/seed/seasons";
import { METRIC_LABEL } from "@/lib/strategyMeta";
import { StrategyBadge, LiveBadge } from "@/components/StrategyBadge";
import { fmtUsd, fmtPct, fmtNum, fmtPctFrac } from "@/lib/format";

const METRICS: LeaderboardMetric[] = ["sharpe", "roiPct", "maxDrawdown"];

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4", "5"];

export function Leaderboard({
  agents,
  seasonId,
  asOfDayIndex,
  initialMetric = "sharpe",
  onMetricChange,
}: {
  agents: AgentSnapshot[];
  seasonId: string;
  asOfDayIndex: number;
  initialMetric?: LeaderboardMetric;
  onMetricChange?: (m: LeaderboardMetric) => void;
}) {
  const [metric, setMetric] = useState<LeaderboardMetric>(initialMetric);

  const leaderboard = computeLeaderboard(agents, metric, seasonId, asOfDayIndex);

  function handleMetric(m: LeaderboardMetric) {
    setMetric(m);
    onMetricChange?.(m);
  }

  return (
    <section className="glass-strong relative overflow-hidden rounded-xl3 shadow-hero">
      {/* subtle ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle,#8b5cf6,transparent 65%)" }}
      />

      <header className="relative flex flex-wrap items-end justify-between gap-3 border-b border-line/60 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            순위
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            리더보드
          </h2>
        </div>
        {/* metric selector */}
        <div
          role="group"
          aria-label="정렬 기준"
          className="flex gap-1 rounded-xl border border-line/70 bg-black/30 p-1"
        >
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => handleMetric(m)}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                metric === m
                  ? "bg-accent text-white shadow-md"
                  : "text-muted hover:text-ink"
              }`}
              aria-pressed={metric === m}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
      </header>

      {/* column headers */}
      <div className="grid grid-cols-[40px_1fr_auto_auto_auto] gap-x-3 border-b border-line/40 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:px-6">
        <span className="text-center">#</span>
        <span>에이전트</span>
        <span className="hidden text-right sm:block">자산</span>
        <span className="text-right">ROI</span>
        <span className="text-right">
          {metric === "sharpe" ? "Sharpe" : metric === "maxDrawdown" ? "Max DD" : "ROI %"}
        </span>
      </div>

      {/* rows with AnimatePresence for reorder */}
      <ul className="divide-y divide-line/40">
        <AnimatePresence mode="popLayout" initial={false}>
          {leaderboard.entries.map((entry) => {
            const agent = AGENTS.find((a) => a.id === entry.agentId)!;
            const snap = agents.find((s) => s.agent.id === entry.agentId)!;
            const uptrend = entry.roiPct >= 0;

            const primaryValue =
              metric === "sharpe"
                ? fmtNum(entry.sharpe, 2)
                : metric === "roiPct"
                ? fmtPct(entry.roiPct)
                : fmtPctFrac(entry.maxDrawdown);

            return (
              <motion.li
                key={entry.agentId}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="group relative grid grid-cols-[40px_1fr_auto_auto_auto] items-center gap-x-3 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.028] sm:px-6"
              >
                {/* faint rank-bar accent on hover */}
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: agent.color }}
                />

                {/* rank */}
                <span className="data text-center text-[13px] font-bold text-muted">
                  {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : entry.rank}
                </span>

                {/* agent info */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: agent.color }}
                    />
                    <span className="truncate font-semibold text-white">{agent.name}</span>
                    {agent.isReal && <LiveBadge stale={agent.isStale} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <StrategyBadge type={agent.strategyType} size="sm" />
                    <span className="hidden text-[10px] text-muted sm:inline">
                      Vol {fmtPctFrac(snap.annualizedVol)}
                    </span>
                  </div>
                </div>

                {/* equity */}
                <span className="data hidden text-right text-sm text-ink sm:block">
                  {fmtUsd(entry.equity)}
                </span>

                {/* ROI */}
                <span
                  className={`data text-right text-sm font-semibold ${
                    uptrend ? "text-good" : "text-bad"
                  }`}
                >
                  {fmtPct(entry.roiPct)}
                </span>

                {/* primary metric */}
                <span
                  className={`data text-right text-sm font-bold ${
                    metric === "maxDrawdown"
                      ? "text-warn"
                      : uptrend
                      ? "text-accent"
                      : "text-muted"
                  }`}
                >
                  {primaryValue}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <footer className="border-t border-line/40 px-5 py-3 text-[11px] text-muted sm:px-6">
        <span className="font-semibold text-accent">{METRIC_LABEL[metric]}</span>{" "}
        기준 정렬. 정규화된 지표이며 단순 손익 절대값만으로는 정렬하지 않습니다.
        시즌 D-{asOfDayIndex}.
      </footer>
    </section>
  );
}
