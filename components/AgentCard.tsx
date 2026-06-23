"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { AgentSnapshot } from "@/lib/types/snapshot";
import { STRATEGY_META } from "@/lib/strategyMeta";
import { StrategyBadge, LiveBadge } from "@/components/StrategyBadge";
import { Sparkline } from "@/components/Sparkline";
import { fmtUsd, fmtPct, fmtPctFrac, fmtNum } from "@/lib/format";

export function AgentCard({
  snap,
  rank,
  delayIndex = 0,
  onClick,
}: {
  snap: AgentSnapshot;
  rank: number;
  delayIndex?: number;
  onClick?: () => void;
}) {
  const [following, setFollowing] = useState(false);
  const { agent, curve, equity, roiPct, sharpe, maxDrawdown, annualizedVol } = snap;
  const meta = STRATEGY_META[agent.strategyType];
  const uptrend = roiPct >= 0;
  const sparkValues = curve.map((p) => p.equity);

  return (
    <motion.article
      className={`glass ring-glow group relative flex flex-col gap-0 overflow-hidden rounded-xl2 ${onClick ? "cursor-pointer" : ""}`}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={onClick ? { scale: 1.015 } : undefined}
      transition={{
        type: "spring",
        stiffness: 160,
        damping: 22,
        delay: 0.08 + delayIndex * 0.07,
      }}
      onClick={onClick}
      aria-label={`${agent.name} agent card${onClick ? " — click for details" : ""}`}
    >
      {/* color accent bar at top */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${meta.color}, ${meta.color}55, transparent)`,
        }}
      />

      {/* header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {/* avatar token */}
          <div
            className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
            style={{
              background: `radial-gradient(circle at 30% 25%, ${meta.color}, ${meta.color}88 55%, ${meta.color}44)`,
              boxShadow: `0 0 0 1px ${meta.color}55, 0 6px 18px rgba(0,0,0,0.4)`,
            }}
          >
            {agent.name.slice(0, 1)}
            <span
              className="data absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bgDeep text-[10px] font-bold text-white"
              style={{ border: `1px solid ${meta.color}` }}
            >
              {rank}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[15px] font-bold tracking-tight text-white">
                {agent.name}
              </h3>
              {agent.isReal && <LiveBadge stale={agent.isStale} />}
            </div>
            <p className="text-[11px] text-muted">{agent.handle}</p>
          </div>
        </div>

        {/* follow button — no-op, demo only */}
        <motion.button
          onClick={() => setFollowing((f) => !f)}
          whileTap={{ scale: 0.94 }}
          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
            following
              ? "border border-accent/50 bg-accent/15 text-accent"
              : "border border-line/80 bg-black/30 text-muted hover:border-accent/40 hover:text-accent"
          }`}
          aria-label={following ? `Unfollow ${agent.name}` : `Follow ${agent.name}`}
          aria-pressed={following}
        >
          {following ? "✓ Following" : "+ Follow"}
        </motion.button>
      </div>

      {/* badges row */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        <StrategyBadge type={agent.strategyType} size="sm" />
        {agent.ownerLabel && (
          <span className="text-[10px] text-muted">{agent.ownerLabel}</span>
        )}
      </div>

      {/* tagline */}
      <p className="px-4 pb-3 text-[12px] leading-relaxed text-muted">
        {agent.tagline}
      </p>

      {/* sparkline + equity */}
      <div className="flex items-end justify-between gap-3 px-4 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">Equity</span>
          <span className="data text-[22px] font-bold leading-none text-white">
            {fmtUsd(equity)}
          </span>
          <span
            className={`data text-[13px] font-semibold ${
              uptrend ? "text-good" : "text-bad"
            }`}
          >
            {fmtPct(roiPct)}
          </span>
        </div>
        <div className="flex-shrink-0">
          <Sparkline values={sparkValues} color={meta.color} width={120} height={44} />
        </div>
      </div>

      {/* metrics footer */}
      <div className="grid grid-cols-3 border-t border-line/50 bg-black/20">
        <MetricCell label="Sharpe" value={fmtNum(sharpe, 2)} color={meta.color} />
        <MetricCell
          label="Max DD"
          value={fmtPctFrac(maxDrawdown)}
          color="#f59e0b"
          borderLeft
        />
        <MetricCell
          label="Ann. Vol"
          value={fmtPctFrac(annualizedVol)}
          color="#a8b3cf"
          borderLeft
        />
      </div>
    </motion.article>
  );
}

function MetricCell({
  label,
  value,
  color,
  borderLeft,
}: {
  label: string;
  value: string;
  color: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 py-2.5 ${
        borderLeft ? "border-l border-line/50" : ""
      }`}
    >
      <span className="text-[9px] uppercase tracking-wider text-muted">{label}</span>
      <span className="data text-[13px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
