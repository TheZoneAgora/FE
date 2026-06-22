import type { AgentDataSource } from "@/lib/data/AgentDataSource";
import type {
  Agent,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardMetric,
  PaperPortfolio,
  Season,
} from "@/lib/types/domain";
import {
  DEFAULT_FEE_BPS,
  DEFAULT_INITIAL_CAPITAL,
  DEFAULT_SLIPPAGE_BPS,
} from "@/lib/config/capital";
import { AGENTS, SEASONS } from "@/lib/data/seed/seasons";
import { simulateCurve } from "@/lib/data/sim/StrategySimulator";
import {
  computeMaxDrawdown,
  computeRoiPct,
  computeSharpe,
  normalizeRacePositions,
} from "@/lib/data/metrics";

/**
 * Number of points in the season so far. In the prototype we expose a fixed
 * "as of" day so the race has a meaningful spread. Server "now" would derive
 * this from (now - season.startDate) in production.
 */
const SEASON_DAYS = 42;

export class MockDataSource implements AgentDataSource {
  async getSeasons(): Promise<Season[]> {
    return SEASONS;
  }

  async getCurrentSeason(): Promise<Season> {
    return SEASONS.find((s) => s.status === "live") ?? SEASONS[0];
  }

  async getAgents(seasonId: string): Promise<Agent[]> {
    return AGENTS.map((a) => ({ ...a, seasonId }));
  }

  async getPortfolio(
    agentId: string,
    seasonId: string
  ): Promise<PaperPortfolio> {
    const agent = AGENTS.find((a) => a.id === agentId)!;
    const season = SEASONS.find((s) => s.id === seasonId) ?? SEASONS[0];
    const days = season.status === "frozen" ? 31 : SEASON_DAYS;
    const equityCurve = simulateCurve({
      agentId,
      strategyType: agent.strategyType,
      seasonId,
      startDate: season.startDate,
      days,
      initialCapital: DEFAULT_INITIAL_CAPITAL,
    });
    return {
      agentId,
      seasonId,
      initialCapital: DEFAULT_INITIAL_CAPITAL,
      feeBps: DEFAULT_FEE_BPS,
      slippageBps: DEFAULT_SLIPPAGE_BPS,
      equityCurve,
    };
  }

  async getLeaderboard(
    seasonId: string,
    metric: LeaderboardMetric
  ): Promise<Leaderboard> {
    const agents = await this.getAgents(seasonId);
    const portfolios = await Promise.all(
      agents.map((a) => this.getPortfolio(a.id, seasonId))
    );

    const rows = portfolios.map((p) => {
      const sharpe = computeSharpe(p.equityCurve);
      const maxDrawdown = computeMaxDrawdown(p.equityCurve);
      const roiPct = computeRoiPct(p.equityCurve, p.initialCapital);
      const last = p.equityCurve[p.equityCurve.length - 1];
      return {
        agentId: p.agentId,
        equity: last.equity,
        pnl: last.pnl,
        roiPct,
        sharpe,
        maxDrawdown,
      };
    });

    // Sort by active normalized metric. Never raw absolute PnL alone (AC10).
    const metricValue = (r: (typeof rows)[number]) =>
      metric === "sharpe"
        ? r.sharpe
        : metric === "roiPct"
        ? r.roiPct
        : -r.maxDrawdown; // less drawdown ranks higher

    const sorted = [...rows].sort((a, b) => metricValue(b) - metricValue(a));

    const racePos = normalizeRacePositions(
      sorted.map((r) =>
        metric === "sharpe"
          ? r.sharpe
          : metric === "roiPct"
          ? r.roiPct
          : r.maxDrawdown
      ),
      metric
    );

    const entries: LeaderboardEntry[] = sorted.map((r, i) => ({
      agentId: r.agentId,
      rank: i + 1,
      equity: r.equity,
      pnl: r.pnl,
      roiPct: r.roiPct,
      sharpe: r.sharpe,
      maxDrawdown: r.maxDrawdown,
      racePos: racePos[i],
    }));

    const asOfDayIndex =
      portfolios[0].equityCurve[portfolios[0].equityCurve.length - 1].dayIndex;

    return { seasonId, metric, asOfDayIndex, entries };
  }
}
