import type {
  Agent,
  Leaderboard,
  LeaderboardMetric,
  PaperPortfolio,
  Season,
} from "@/lib/types/domain";

/**
 * Stable contract for the data layer. v1 = MockDataSource (computed on read).
 * A future real engine / KvDataSource drops in behind this interface with
 * zero UI changes (plan principle 2, AC9).
 */
export interface AgentDataSource {
  getSeasons(): Promise<Season[]>;
  getCurrentSeason(): Promise<Season>;
  getAgents(seasonId: string): Promise<Agent[]>;
  getPortfolio(agentId: string, seasonId: string): Promise<PaperPortfolio>;
  getLeaderboard(
    seasonId: string,
    metric: LeaderboardMetric
  ): Promise<Leaderboard>;
}
