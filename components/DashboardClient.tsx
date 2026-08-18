"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { EquityPoint, LeaderboardMetric } from "@/lib/types/domain";
import type { AgentSnapshot, DashboardSnapshot } from "@/lib/types/snapshot";
import { computeLeaderboard } from "@/lib/leaderboard";
import { RaceTrack } from "@/components/RaceTrack";
import { Leaderboard } from "@/components/Leaderboard";
import { AgentCard } from "@/components/AgentCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { MintDetailPanel } from "@/components/MintDetailPanel";
import { LivePriceBadge } from "@/components/LivePriceBadge";
import { fmtUsd } from "@/lib/format";
import { DEFAULT_INITIAL_CAPITAL } from "@/lib/config/capital";
import { getLiveStrategyEngine } from "@/lib/live/LiveStrategyEngine";
import type { LiveAgentState, PriceSource } from "@/lib/live/types";
import {
  computeAnnualizedVol,
  computeMaxDrawdown,
  computeSharpe,
} from "@/lib/data/metrics";

// MINT은 실제 체결 데이터(lib/data/AgentDataSource)를 별도로 유지한다 —
// 라이브 엔진이 계산하는 페이퍼 포지션은 MINT의 표시 자산/곡선에 병합하지 않는다.
const LIVE_MERGE_EXCLUDED_AGENT_ID = "mint";
const MAX_LIVE_TAIL_POINTS = 300;

interface LiveOverlay {
  equity: number;
  roiPct: number;
  sharpe: number;
  maxDrawdown: number;
  annualizedVol: number;
  curve: EquityPoint[];
}

function mergeAgentWithLiveOverlay(
  snap: AgentSnapshot,
  overlay: LiveOverlay | undefined
): AgentSnapshot {
  if (!overlay) return snap;
  return {
    ...snap,
    curve: overlay.curve,
    equity: overlay.equity,
    roiPct: overlay.roiPct,
    sharpe: overlay.sharpe,
    maxDrawdown: overlay.maxDrawdown,
    annualizedVol: overlay.annualizedVol,
    pnl: overlay.equity - snap.initialCapital,
  };
}

export function DashboardClient({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { season, seasons, asOfDayIndex, agents } = snapshot;
  const [metric, setMetric] = useState<LeaderboardMetric>("sharpe");
  const [selectedSeason, setSelectedSeason] = useState(season.id);
  const [mintPanelOpen, setMintPanelOpen] = useState(false);
  const [priceSource, setPriceSource] = useState<PriceSource>("simulated");
  const [liveOverlays, setLiveOverlays] = useState<Map<string, LiveOverlay>>(
    new Map()
  );

  // 초기(MockDataSource) 시리즈는 그대로 두고, 라이브 틱은 델타로 이어붙인다 —
  // 새로고침해도 엔진이 localStorage에서 복원하므로 연속성이 유지된다.
  const baseAgentsRef = useRef<Map<string, AgentSnapshot>>(new Map());
  const anchorEquityRef = useRef<Map<string, number>>(new Map());
  const liveTailRef = useRef<Map<string, EquityPoint[]>>(new Map());
  const tickStartRef = useRef<number | null>(null);

  useEffect(() => {
    baseAgentsRef.current = new Map(agents.map((a) => [a.agent.id, a]));
  }, [agents]);

  const applyEngineAgents = useCallback(
    (engineAgents: LiveAgentState[], timestamp: number) => {
      const bases = baseAgentsRef.current;
      if (tickStartRef.current === null) tickStartRef.current = timestamp;
      const elapsedDays = (timestamp - tickStartRef.current) / 86_400_000;

      setLiveOverlays((prev) => {
        const next = new Map(prev);
        for (const live of engineAgents) {
          if (live.agentId === LIVE_MERGE_EXCLUDED_AGENT_ID) continue;
          const base = bases.get(live.agentId);
          if (!base || base.curve.length === 0) continue;

          if (!anchorEquityRef.current.has(live.agentId)) {
            anchorEquityRef.current.set(live.agentId, live.equity);
          }
          const anchor = anchorEquityRef.current.get(live.agentId)!;
          const mergedEquity = base.equity + (live.equity - anchor);

          const baseLast = base.curve[base.curve.length - 1];
          const point: EquityPoint = {
            dayIndex: baseLast.dayIndex + elapsedDays,
            ts: new Date(timestamp).toISOString(),
            equity: mergedEquity,
            pnl: mergedEquity - base.initialCapital,
            roiPct:
              ((mergedEquity - base.initialCapital) / base.initialCapital) * 100,
          };

          const tail = [...(liveTailRef.current.get(live.agentId) ?? []), point];
          if (tail.length > MAX_LIVE_TAIL_POINTS) {
            tail.splice(0, tail.length - MAX_LIVE_TAIL_POINTS);
          }
          liveTailRef.current.set(live.agentId, tail);

          const mergedCurve = [...base.curve, ...tail];
          next.set(live.agentId, {
            equity: mergedEquity,
            roiPct: point.roiPct,
            sharpe: computeSharpe(mergedCurve),
            maxDrawdown: computeMaxDrawdown(mergedCurve),
            annualizedVol: computeAnnualizedVol(mergedCurve),
            curve: mergedCurve,
          });
        }
        return next;
      });
    },
    []
  );

  // 클라이언트 전용 구독 — LiveStrategyEngine은 SSR 가드가 있어 서버에서는 시작하지 않는다.
  useEffect(() => {
    const engine = getLiveStrategyEngine();
    const initial = engine.getSnapshot();
    applyEngineAgents(initial.agents, initial.updatedAt);
    setPriceSource(initial.priceSource);

    const unsubscribe = engine.subscribe((tick) => {
      applyEngineAgents(tick.agents, tick.timestamp);
      setPriceSource(tick.priceSource);
    });
    return unsubscribe;
  }, [applyEngineAgents]);

  const liveAgents = useMemo(
    () =>
      agents.map((a) => mergeAgentWithLiveOverlay(a, liveOverlays.get(a.agent.id))),
    [agents, liveOverlays]
  );

  const mintSnap = liveAgents.find((a) => a.agent.id === "mint");

  const leaderboard = computeLeaderboard(liveAgents, metric, season.id, asOfDayIndex);

  // Build runner rows for the race track
  const runnerRows = leaderboard.entries.map((e) => ({
    snap: liveAgents.find((a) => a.agent.id === e.agentId)!,
    racePos: e.racePos,
    rank: e.rank,
  }));

  // Cards in leaderboard rank order
  const cardOrder = leaderboard.entries.map((e) =>
    liveAgents.find((a) => a.agent.id === e.agentId)!
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
        priceSource={priceSource}
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
              agents={liveAgents}
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
            <EquityCurveChart agents={liveAgents} />
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
              참가 에이전트
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
              에이전트 프로필
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
                  onClick={snap.agent.id === "mint" && snap.mintData ? () => setMintPanelOpen(true) : undefined}
                />
              );
            })}
          </div>
        </section>

        {/* ── Gradient rule ──────────────────────────────────── */}
        <div className="gradient-rule h-px w-full opacity-40" />

        {/* ── MINT detail panel ─────────────────────────────── */}
        {mintPanelOpen && mintSnap?.mintData && (
          <MintDetailPanel data={mintSnap.mintData} onClose={() => setMintPanelOpen(false)} />
        )}

        {/* ── Footnote / info ───────────────────────────────── */}
        <footer className="text-center text-[12px] leading-relaxed text-muted">
          <p>
            모든 에이전트는{" "}
            <span className="font-semibold text-ink">
              {fmtUsd(DEFAULT_INITIAL_CAPITAL)} 표준 페이퍼 자본
            </span>{" "}
            기준으로 동일한 수수료·슬리피지 조건 아래 경쟁합니다. 순위는 위험조정
            지표(샤프지수 / ROI% / 최대낙폭) 기준이며, 단순 손익 절대값만으로는
            절대 매기지 않습니다.
          </p>
          <p className="mt-1">
            MINT는 실제 체결 데이터를 사용하는 유일한 에이전트이며, 나머지 4개는
            실시간 시세에 반응하는 페이퍼 트레이딩 시뮬레이션입니다. Season 1 · 2026년 6월.
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
  priceSource,
}: {
  seasonLabel: string;
  asOfDayIndex: number;
  seasons: DashboardSnapshot["seasons"];
  selectedSeason: string;
  onSeasonChange: (id: string) => void;
  priceSource: PriceSource;
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
            에이전트 더비
          </span>
        </motion.div>

        {/* hero headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 font-display text-[42px] font-extrabold leading-[1.1] tracking-[-0.04em] text-white sm:text-[56px] lg:text-[68px]"
        >
          <span className="gradient-text">5개의 에이전트.</span>
          <br />
          하나의 기준.
          <br />
          <span className="text-white/70">승자는 누구?</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted"
        >
          자율 트레이딩 에이전트들이 표준화된{" "}
          <span className="font-semibold text-ink">$10,000 페이퍼 자본</span>{" "}
          기준으로 경쟁합니다 — 동일한 수수료, 동일한 슬리피지. 순위는 원시
          수익률이 아닌 위험조정 성과 기준입니다.
        </motion.p>

        {/* metadata chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-7 flex flex-wrap items-center gap-3"
        >
          <MetaChip icon="🏁" label={seasonLabel} />
          <MetaChip icon="📅" label={`시즌 D-${asOfDayIndex}`} />
          <MetaChip icon="💰" label="$10,000 표준 자본" accent />
          <LivePriceBadge source={priceSource} />

          {/* season selector */}
          <div className="ml-auto">
            <select
              value={selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
              className="rounded-full border border-line/70 bg-black/40 px-3 py-1.5 text-[12px] font-medium text-muted backdrop-blur focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              aria-label="시즌 선택"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} {s.status === "frozen" ? "(종료됨)" : ""}
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
