import type { Leaderboard, LeaderboardEntry, LeaderboardMetric } from "@/lib/types/domain";
import type { AgentSnapshot } from "@/lib/types/snapshot";
import { normalizeRacePositions } from "@/lib/data/metrics";

/**
 * Compute a ranked leaderboard from a snapshot for a given metric.
 * Pure function — safe to call client-side (no fs / Node deps).
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
