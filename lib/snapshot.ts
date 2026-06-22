import type {
  Agent,
  EquityPoint,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardMetric,
  Season,
} from "@/lib/types/domain";
import { getDataSource } from "@/lib/data";
import {
  computeAnnualizedVol,
  computeMaxDrawdown,
  computeRoiPct,
  computeSharpe,
  normalizeRacePositions,
} from "@/lib/data/metrics";

export interface AgentSnapshot {
  agent: Agent;
  initialCapital: number;
  curve: EquityPoint[];
  sharpe: number;
  maxDrawdown: number;
  roiPct: number;
  annualizedVol: number;
  equity: number;
  pnl: number;
}

export interface DashboardSnapshot {
  season: Season;
  seasons: Season[];
  asOfDayIndex: number;
  agents: AgentSnapshot[];
}

/** Build the full snapshot server-side for a season. */
export async function buildSnapshot(
  seasonId?: string
): Promise<DashboardSnapshot> {
  const ds = getDataSource();
  const seasons = await ds.getSeasons();
  const season =
    (seasonId && seasons.find((s) => s.id === seasonId)) ||
    (await ds.getCurrentSeason());
  const agents = await ds.getAgents(season.id);

  const agentSnaps: AgentSnapshot[] = await Promise.all(
    agents.map(async (agent) => {
      const p = await ds.getPortfolio(agent.id, season.id);
      const last = p.equityCurve[p.equityCurve.length - 1];
      return {
        agent,
        initialCapital: p.initialCapital,
        curve: p.equityCurve,
        sharpe: computeSharpe(p.equityCurve),
        maxDrawdown: computeMaxDrawdown(p.equityCurve),
        roiPct: computeRoiPct(p.equityCurve, p.initialCapital),
        annualizedVol: computeAnnualizedVol(p.equityCurve),
        equity: last.equity,
        pnl: last.pnl,
      };
    })
  );

  const asOfDayIndex = agentSnaps[0].curve[agentSnaps[0].curve.length - 1].dayIndex;

  return { season, seasons, asOfDayIndex, agents: agentSnaps };
}

/**
 * Compute a ranked leaderboard from a snapshot for a given metric.
 * Runs client-side so metric switches are instant (no refetch).
 */
export function computeLeaderboard(
  agents: AgentSnapshot[],
  metric: LeaderboardMetric,
  seasonId: string,
  asOfDayIndex: number
): Leaderboard {
  const oriented = (s: AgentSnapshot) =>
    metric === "sharpe"
      ? s.sharpe
      : metric === "roiPct"
      ? s.roiPct
      : -s.maxDrawdown;

  const sorted = [...agents].sort((a, b) => oriented(b) - oriented(a));

  const racePos = normalizeRacePositions(
    sorted.map((s) =>
      metric === "sharpe" ? s.sharpe : metric === "roiPct" ? s.roiPct : s.maxDrawdown
    ),
    metric
  );

  const entries: LeaderboardEntry[] = sorted.map((s, i) => ({
    agentId: s.agent.id,
    rank: i + 1,
    equity: s.equity,
    pnl: s.pnl,
    roiPct: s.roiPct,
    sharpe: s.sharpe,
    maxDrawdown: s.maxDrawdown,
    racePos: racePos[i],
  }));

  return { seasonId, metric, asOfDayIndex, entries };
}
