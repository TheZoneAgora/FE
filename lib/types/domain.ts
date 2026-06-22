// Canonical domain types for Agora "Agent Derby".
// Mirrors the plan (.omc/plans/agora-agent-derby-v1.md, Step 1).

export type StrategyType =
  | "polymarket"
  | "weather-arb"
  | "stocks"
  | "crypto"
  | "mint";

export interface Agent {
  id: string;
  name: string;
  /** short handle e.g. "@mint" */
  handle: string;
  strategyType: StrategyType;
  /** Exactly one seed agent (MINT) is real. */
  isReal: boolean;
  /** STALE flag for the real agent when ingest is offline. */
  isStale?: boolean;
  seasonId: string;
  ownerLabel?: string;
  /** One-line strategy pitch shown on the card. */
  tagline: string;
  /** accent hue used for runner / chart series, hex */
  color: string;
}

export type SeasonStatus = "live" | "frozen";

export interface Season {
  id: string;
  label: string; // "Season 1 · June 2026"
  month: string; // "2026-06"
  startDate: string; // ISO8601 UTC
  status: SeasonStatus;
  agentIds: string[];
}

export interface EquityPoint {
  dayIndex: number; // day from season.startDate (D-n)
  ts: string; // ISO8601 UTC
  equity: number;
  pnl: number;
  roiPct: number;
}

export interface PaperPortfolio {
  agentId: string;
  seasonId: string;
  initialCapital: number;
  feeBps: number;
  slippageBps: number;
  equityCurve: EquityPoint[];
}

export type LeaderboardMetric = "sharpe" | "roiPct" | "maxDrawdown";

export interface LeaderboardEntry {
  agentId: string;
  rank: number;
  equity: number;
  pnl: number;
  roiPct: number;
  sharpe: number;
  maxDrawdown: number; // positive fraction, e.g. 0.18 = 18%
  /** normalized 0..1 race position derived from active metric */
  racePos: number;
}

export interface Leaderboard {
  seasonId: string;
  metric: LeaderboardMetric;
  asOfDayIndex: number;
  entries: LeaderboardEntry[];
}
