import "server-only";
import type { MintRealData } from "@/lib/types/mint";
import type { AgentSnapshot, DashboardSnapshot } from "@/lib/types/snapshot";
import { getDataSource } from "@/lib/data";
import {
  computeAnnualizedVol,
  computeMaxDrawdown,
  computeRoiPct,
  computeSharpe,
} from "@/lib/data/metrics";

export type { AgentSnapshot, DashboardSnapshot };

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

  // Duck-type getMintRealData — available on MockDataSource, skipped otherwise
  const mintRealData: MintRealData | undefined =
    typeof (ds as unknown as { getMintRealData?: () => MintRealData }).getMintRealData === "function"
      ? (ds as unknown as { getMintRealData: () => MintRealData }).getMintRealData()
      : undefined;

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
        mintData: agent.id === "mint" && season.id === "s1" ? mintRealData : undefined,
      };
    })
  );

  const asOfDayIndex = agentSnaps[0].curve[agentSnaps[0].curve.length - 1].dayIndex;

  return { season, seasons, asOfDayIndex, agents: agentSnaps };
}
