"use client";

/**
 * design/agora-arena.html의 목업 AGENTS 배열 대신, 실제 LiveStrategyEngine을 구독해
 * 화면에 필요한 형태(ArenaAgent)로 매핑한다.
 * - ret: 엔진 roiPct 그대로
 * - mdd: equitySeries에서 계산한 최대 낙폭(%)
 * - score(AGORA 점수): 50 + ret*3.2 - mdd*2.1, 1~99로 클램프
 * - backers/aum/win: 그럴듯한 시드값 + 틱마다 소폭 증가(mock, 원본 tick()의 25% 확률 로직 재현)
 */

import { useEffect, useRef, useState } from "react";
import { getLiveStrategyEngine } from "@/lib/live/LiveStrategyEngine";
import type { LiveAgentState } from "@/lib/live/types";
import { AGENTS as SEED_AGENTS } from "@/lib/data/seed/seasons";
import { characterFor } from "@/components/arena/characters";

export interface ArenaAgent {
  id: string;
  name: string;
  strat: string;
  real: boolean;
  accent: string;
  ret: number;
  mdd: number;
  win: number;
  backers: number;
  aum: number;
  hist: number[];
  score: number;
}

const AGENT_ORDER = ["mint", "axiom", "delphi", "atlas", "zephyr"];

const MOCK_SEED: Record<string, { backers: number; aum: number; win: number }> = {
  mint: { backers: 214, aum: 48_200, win: 64 },
  axiom: { backers: 151, aum: 31_400, win: 57 },
  delphi: { backers: 128, aum: 26_800, win: 71 },
  atlas: { backers: 64, aum: 15_200, win: 49 },
  zephyr: { backers: 37, aum: 8_600, win: 44 },
};

function stratLabel(tagline: string): string {
  return tagline.split(".")[0]?.trim() || tagline;
}

function computeMddPct(series: { equity: number }[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const p of series) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = ((peak - p.equity) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return Math.max(0.5, Math.round(maxDd * 10) / 10);
}

function scoreOf(ret: number, mdd: number): number {
  return Math.max(1, Math.min(99, Math.round(50 + ret * 3.2 - mdd * 2.1)));
}

function buildAgent(
  state: LiveAgentState,
  mock: { backers: number; aum: number; win: number }
): ArenaAgent {
  const seed = SEED_AGENTS.find((a) => a.id === state.agentId);
  const ret = Math.round(state.roiPct * 100) / 100;
  const mdd = computeMddPct(state.equitySeries);
  const hist =
    state.equitySeries.length >= 2
      ? state.equitySeries.map((p) => ((p.equity - 10_000) / 10_000) * 100)
      : [ret, ret];
  return {
    id: state.agentId,
    name: (seed?.name ?? state.agentId).toUpperCase(),
    strat: seed ? stratLabel(seed.tagline) : state.strategy,
    real: seed?.isReal ?? false,
    accent: characterFor(state.agentId).accent,
    ret,
    mdd,
    win: mock.win,
    backers: mock.backers,
    aum: mock.aum,
    hist,
    score: scoreOf(ret, mdd),
  };
}

export function useArenaAgents(): ArenaAgent[] {
  const engine = getLiveStrategyEngine();
  const mockRef = useRef<Record<string, { backers: number; aum: number; win: number }>>(
    Object.fromEntries(AGENT_ORDER.map((id) => [id, { ...MOCK_SEED[id] }]))
  );
  const [snapshotAgents, setSnapshotAgents] = useState<LiveAgentState[]>(
    () => engine.getSnapshot().agents
  );

  useEffect(() => {
    const unsubscribe = engine.subscribe((tick) => {
      for (const state of tick.agents) {
        const mock = mockRef.current[state.agentId];
        if (!mock) continue;
        if (Math.random() < 0.25) mock.backers += Math.floor(Math.random() * 3);
        if (Math.random() < 0.25) mock.aum += Math.floor(Math.random() * 900);
      }
      setSnapshotAgents(tick.agents);
    });
    return unsubscribe;
  }, [engine]);

  const byId = new Map(snapshotAgents.map((s) => [s.agentId, s]));
  return AGENT_ORDER.map((id) => buildAgent(byId.get(id)!, mockRef.current[id]));
}
