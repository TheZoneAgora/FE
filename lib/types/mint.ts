import type { EquityPoint } from "@/lib/types/domain";

export interface MintStrategySnapshot {
  strategy: string;
  asset: string;
  tf: string;
  equityAtSeasonStart: number;
  currentEquity: number;
  seasonPnl: number;
  seasonRoiPct: number;
  season1Trades: number;
  season1Wins: number;
  season1WinRate: number;
}

export interface MintTrade {
  ts: string;
  strategy: string;
  action: "exit" | "partial";
  side: "long" | "short";
  entry: number;
  exit: number;
  leverage: number;
  pnl: number;
  equity: number;
  reason: string;
}

export interface MintKalshiSummary {
  total_trades: number;
  wins: number;
  losses: number;
  pending: number;
  total_pnl: number;
  total_bet: number;
  roi_pct: number;
  win_rate: number;
  avg_edge_pct: number;
  last_updated: string;
}

export interface MintKalshiTrade {
  id: string;
  ticker: string;
  city: string;
  side: string;
  condition_label: string;
  target_date: string;
  entry_price: number;
  implied_prob: number;
  edge: number;
  contracts: number;
  bet_amount: number;
  forecast_temp: number;
  outcome: "win" | "loss" | "pending";
  pnl: number;
  short_title: string;
  resolved_at: string | null;
}

export interface MintRealData {
  generatedAt: string;
  seasonId: string;
  initialCapital: number;
  equityCurve: EquityPoint[];
  strategySnapshots: MintStrategySnapshot[];
  recentTrades: MintTrade[];
  kalshiSummary: MintKalshiSummary;
  kalshiRecentTrades: MintKalshiTrade[];
}
