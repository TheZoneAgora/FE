import type { Agent, EquityPoint, Season } from "@/lib/types/domain";
import type { MintRealData } from "@/lib/types/mint";

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
  mintData?: MintRealData;
}

export interface DashboardSnapshot {
  season: Season;
  seasons: Season[];
  asOfDayIndex: number;
  agents: AgentSnapshot[];
}
