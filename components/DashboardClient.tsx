"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LeaderboardMetric } from "@/lib/types/domain";
import type { DashboardSnapshot } from "@/lib/snapshot";
import { computeLeaderboard } from "@/lib/snapshot";
import { RaceTrack } from "@/components/RaceTrack";
import { Leaderboard } from "@/components/Leaderboard";
import { AgentCard } from "@/components/AgentCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { AGENTS } from "@/lib/data/seed/seasons";
import { fmtUsd } from "@/lib/format";
import { DEFAULT_INITIAL_CAPITAL } from "@/lib/config/capital";

export function DashboardClient({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { season, seasons, asOfDayIndex, agents } = snapshot;
  const [metric, setMetric] = useState<LeaderboardMetric>("sharpe");
  const [selectedSeason, setSelectedSeason] = useState(season.id);

  const leaderboard = computeLeaderboard(agents, metric, season.id, asOfDayIndex);

  // Build runner rows for the race track
  const runnerRows = leaderboard.entries.map((e) => ({
    snap: agents.find((a) => a.agent.id === e.agentId)!,
    racePos: e.racePos,
    rank: e.rank,
  }));

  // Cards in leaderboard rank order
  const cardOrder = leaderboard.entries.map((e) =>
    agents.find((a) => a.agent.id === e.agentId)!
  );

  return (
    <div className="min-h-screen">
      {/* ── Hero / Header ─────────────────────────────────────── */}
      <Hero
        seasonLabel={season.label}
        asOfDayIndex={asOfDayIndex}
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
      />

      <main className="mx-auto max-w-[1200px] space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        {/* ── Race Track ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <RaceTrack rows={runnerRows} metric={metric} />
        </motion.div>

        {/* ── Two-column: Leaderboard + Equity Curves ──────────── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Leaderboard
              agents={agents}
              seasonId={season.id}
              asOfDayIndex={asOfDayIndex}
              initialMetric={metric}
              onMetricChange={setMetric}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.42, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <EquityCurveChart agents={agents} />
          </motion.div>
        </div>

        {/* ── Agent Cards ────────────────────────────────────── */}
        <section>
          <motion.header
            className="mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              The Field
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
              Agent Profiles
            </h2>
          </motion.header>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cardOrder.map((snap, i) => {
              const entry = leaderboard.entries.find(
                (e) => e.agentId === snap.agent.id
              )!;
              return (
                <AgentCard
                  key={snap.agent.id}
                  snap={snap}
                  rank={entry.rank}
                  delayIndex={i}
                />
              );
            })}
          </div>
        </section>

        {/* ── Gradient rule ──────────────────────────────────── */}
        <div className="gradient-rule h-px w-full opacity-40" />

        {/* ── Footnote / info ───────────────────────────────── */}
        <footer className="text-center text-[12px] leading-relaxed text-muted">
          <p>
            All agents compete on a standardized{" "}
            <span className="font-semibold text-ink">
              {fmtUsd(DEFAULT_INITIAL_CAPITAL)} paper basis
            </span>{" "}
            with identical fees and slippage. Ranking by risk-adjusted metric
            (Sharpe / ROI% / Max Drawdown) — never raw absolute PnL.
          </p>
          <p className="mt-1">
            MINT is the only live agent; all others are deterministic simulations.
            Season 1 · June 2026.
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ── Hero component ──────────────────────────────────────────── */

function Hero({
  seasonLabel,
  asOfDayIndex,
  seasons,
  selectedSeason,
  onSeasonChange,
}: {
  seasonLabel: string;
  asOfDayIndex: number;
  seasons: DashboardSnapshot["seasons"];
  selectedSeason: string;
  onSeasonChange: (id: string) => void;
}) {
  return (
    <header className="relative mb-10 overflow-hidden">
      {/* layered radial glows — reference aesthetic */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle,rgba(139,92,246,0.38),transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-48 -top-36 h-[600px] w-[600px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle,rgba(6,182,212,0.28),transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background:
            "linear-gradient(0deg, #070a12 0%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-10 pt-14 sm:px-6 lg:px-8">
        {/* brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center gap-3"
        >
          {/* wordmark */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Agora
          </span>
          <span className="text-muted/60">·</span>
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted">
            Agent Derby
          </span>
        </motion.div>

        {/* hero headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 font-display text-[42px] font-extrabold leading-[1.1] tracking-[-0.04em] text-white sm:text-[56px] lg:text-[68px]"
        >
          <span className="gradient-text">5 Agents.</span>
          <br />
          One Standard.
          <br />
          <span className="text-white/70">Who Wins?</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted"
        >
          Autonomous trading agents race on a standardized{" "}
          <span className="font-semibold text-ink">$10,000 paper-capital basis</span>{" "}
          — identical fees, identical slippage. Ranked by risk-adjusted performance,
          not raw returns.
        </motion.p>

        {/* metadata chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-7 flex flex-wrap gap-3"
        >
          <MetaChip icon="🏁" label={seasonLabel} />
          <MetaChip icon="📅" label={`D-${asOfDayIndex} of season`} />
          <MetaChip icon="💰" label="$10,000 standardized basis" accent />
          <MetaChip icon="⚡" label="1 live agent · 4 sims" />

          {/* season selector */}
          <div className="ml-auto">
            <select
              value={selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
              className="rounded-full border border-line/70 bg-black/40 px-3 py-1.5 text-[12px] font-medium text-muted backdrop-blur focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              aria-label="Select season"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} {s.status === "frozen" ? "(Frozen)" : ""}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* horizontal gradient divider */}
        <div className="gradient-rule mt-10 h-px w-full opacity-50" />
      </div>
    </header>
  );
}

function MetaChip({
  icon,
  label,
  accent,
}: {
  icon: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        accent
          ? "border-accent2/30 bg-accent2/10 text-accent2"
          : "border-line/70 bg-black/30 text-muted"
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}
