"use client";

import { motion } from "framer-motion";
import type { LeaderboardMetric } from "@/lib/types/domain";
import type { AgentSnapshot } from "@/lib/types/snapshot";
import { STRATEGY_META, METRIC_LABEL } from "@/lib/strategyMeta";
import { LiveBadge } from "@/components/StrategyBadge";
import { fmtPct } from "@/lib/format";

interface RunnerRow {
  snap: AgentSnapshot;
  racePos: number; // 0..1
  rank: number;
}

export function RaceTrack({
  rows,
  metric,
}: {
  rows: RunnerRow[];
  metric: LeaderboardMetric;
}) {
  // Keep a stable lane order (by agent id) so lanes don't reshuffle; only the
  // runner's horizontal position animates as the metric / data changes.
  const lanes = [...rows].sort((a, b) =>
    a.snap.agent.id.localeCompare(b.snap.agent.id)
  );

  return (
    <section className="glass-strong relative overflow-hidden rounded-xl3 p-5 shadow-hero sm:p-7">
      {/* ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle,#8b5cf6,transparent 60%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle,#06b6d4,transparent 60%)" }}
      />

      <header className="relative mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            The Derby · Live Race
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            Runners by{" "}
            <span className="gradient-text">{METRIC_LABEL[metric]}</span>
          </h2>
        </div>
        <div className="hidden items-center gap-2 text-[11px] uppercase tracking-wider text-muted sm:flex">
          <span className="h-2 w-2 rounded-full bg-accent" /> Gate
          <span className="ml-2 h-2 w-2 rounded-full bg-accent2" /> Finish
        </div>
      </header>

      <div className="relative scroll-thin overflow-x-auto">
        <div className="relative min-w-[560px]">
          {/* finish line */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-[8%] top-0 w-px"
            style={{
              background:
                "linear-gradient(180deg,transparent,rgba(6,182,212,0.7),transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-[8%] top-0 w-px"
            style={{
              background:
                "linear-gradient(180deg,transparent,rgba(139,92,246,0.5),transparent)",
            }}
          />

          <div className="flex flex-col gap-3">
            {lanes.map((row, laneIdx) => (
              <Lane key={row.snap.agent.id} row={row} laneIdx={laneIdx} />
            ))}
          </div>
        </div>
      </div>

      <footer className="relative mt-4 flex items-center justify-between text-[11px] text-muted">
        <span className="data">START · D0</span>
        <span className="hidden sm:inline">
          Standardized $10,000 paper basis · identical fees &amp; slippage
        </span>
        <span className="data text-accent2">FINISH</span>
      </footer>
    </section>
  );
}

function Lane({ row, laneIdx }: { row: RunnerRow; laneIdx: number }) {
  const { snap, racePos, rank } = row;
  const meta = STRATEGY_META[snap.agent.strategyType];
  const leader = rank === 1;
  // map racePos (0..1) into the 8%..92% travel band
  const leftPct = 8 + racePos * 84;

  return (
    <div className="relative h-[58px] rounded-2xl border border-line/60 bg-black/20">
      {/* lane texture */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-[0.5]"
        style={{
          background:
            "repeating-linear-gradient(90deg,transparent 0 38px,rgba(255,255,255,0.018) 38px 39px)",
        }}
      />
      {/* trailing comet behind the runner */}
      <motion.div
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
        style={{
          left: "8%",
          transformOrigin: "left center",
          background: `linear-gradient(90deg,transparent, ${meta.color}66)`,
          willChange: "transform",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: (leftPct - 8) / 84 }}
        transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.15 + laneIdx * 0.06 }}
      >
        <div style={{ width: "100%", height: "100%" }} />
      </motion.div>

      {/* the runner token */}
      <motion.div
        className="absolute top-1/2"
        style={{ willChange: "transform" }}
        initial={{ left: "8%", x: "-50%", y: "-50%", opacity: 0, scale: 0.6 }}
        animate={{ left: `${leftPct}%`, x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 55,
          damping: 16,
          delay: 0.15 + laneIdx * 0.06,
        }}
      >
        <Runner snap={snap} rank={rank} leader={leader} color={meta.color} />
      </motion.div>
    </div>
  );
}

function Runner({
  snap,
  rank,
  leader,
  color,
}: {
  snap: AgentSnapshot;
  rank: number;
  leader: boolean;
  color: string;
}) {
  return (
    <div className="group relative flex items-center gap-2">
      <motion.div
        className="relative flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold text-white"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${color}, ${color}99 60%, ${color}55)`,
          boxShadow: leader
            ? `0 0 0 2px ${color}, 0 0 26px ${color}aa`
            : `0 0 0 1px ${color}66, 0 6px 18px rgba(0,0,0,0.5)`,
          willChange: "transform",
        }}
        animate={leader ? { y: [0, -3, 0] } : { y: 0 }}
        transition={
          leader
            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        {snap.agent.name.slice(0, 1)}
        {/* rank pip */}
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-bgDeep text-[9px] font-bold text-white data"
          style={{ border: `1px solid ${color}` }}
        >
          {rank}
        </span>
      </motion.div>

      <div className="hidden flex-col leading-tight sm:flex">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
          {snap.agent.name}
          {snap.agent.isReal && <LiveBadge stale={snap.agent.isStale} />}
        </span>
        <span
          className="data text-[11px]"
          style={{ color: snap.roiPct >= 0 ? "#34d399" : "#ef4444" }}
        >
          {fmtPct(snap.roiPct)}
        </span>
      </div>
    </div>
  );
}
