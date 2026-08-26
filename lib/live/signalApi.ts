import { fetchKlinesForSymbols, KLINES_INTERVAL, KLINES_LIMIT } from "@/lib/live/klines";
import { replayStrategy, type ReplaySignal } from "@/lib/live/replaySignal";
import { requiredSymbolsFor, STRATEGY_CONFIGS, type StrategyConfig } from "@/lib/live/strategyLogic";
import type { TickerSymbol } from "@/lib/live/types";

export const DISCLAIMER =
  "실시간 시세 기반 페이퍼 트레이딩 시뮬레이션입니다 — 실제 자금 거래가 아닙니다. " +
  "price_source는 Binance 공개 klines이고, 판단(전략) 로직은 이 프로젝트에서 만든 " +
  "일반 휴리스틱입니다(고객사 실전략과 무관).";

function serializeSignal(signal: ReplaySignal) {
  return {
    signal_id: signal.id,
    side: signal.side,
    symbol: signal.symbol,
    price: signal.price,
    risk_score_bps: signal.riskScoreBps,
    verdict: signal.verdict,
    reason: signal.rejectReason ?? null,
    timestamp: new Date(signal.timestamp).toISOString(),
  };
}

export interface AgentSignalPayload {
  agent_id: string;
  strategy: string;
  symbol: string;
  data_source: string;
  as_of: string;
  equity_usd: number;
  roi_pct: number;
  current_position: { side: "LONG"; entry_price: number; quantity: number } | null;
  latest_signal: ReturnType<typeof serializeSignal> | null;
  recent_signals: ReturnType<typeof serializeSignal>[];
  disclaimer: string;
}

function findConfig(agentId: string): StrategyConfig | null {
  return STRATEGY_CONFIGS.find((c) => c.agentId === agentId) ?? null;
}

function toPayload(
  cfg: StrategyConfig,
  histories: Partial<Record<TickerSymbol, number[]>>
): AgentSignalPayload {
  const result = replayStrategy(cfg, histories);
  const sorted = [...result.signals].sort((a, b) => b.index - a.index);
  const latest = sorted[0] ?? null;

  return {
    agent_id: result.agentId,
    strategy: result.strategy,
    symbol: result.symbol,
    data_source: `binance_klines_${KLINES_INTERVAL}_last${KLINES_LIMIT}`,
    as_of: new Date().toISOString(),
    equity_usd: Math.round(result.equity * 100) / 100,
    roi_pct: Math.round(result.roiPct * 100) / 100,
    current_position: result.position
      ? {
          side: "LONG",
          entry_price: result.position.entryPrice,
          quantity: result.position.quantity,
        }
      : null,
    latest_signal: latest ? serializeSignal(latest) : null,
    recent_signals: sorted.slice(0, 10).map(serializeSignal),
    disclaimer: DISCLAIMER,
  };
}

/** 단일 에이전트 시그널 조회. agentId가 없으면 null. */
export async function buildAgentSignal(agentId: string): Promise<AgentSignalPayload | null> {
  const cfg = findConfig(agentId);
  if (!cfg) return null;
  const histories = await fetchKlinesForSymbols(requiredSymbolsFor(cfg));
  return toPayload(cfg, histories);
}

/** 전 에이전트 시그널 조회 — 심볼별 klines 호출을 공유해서 중복 요청을 없앤다. */
export async function buildAllSignals(): Promise<AgentSignalPayload[]> {
  const allSymbols = STRATEGY_CONFIGS.flatMap(requiredSymbolsFor);
  const histories = await fetchKlinesForSymbols(allSymbols);
  return STRATEGY_CONFIGS.map((cfg) => toPayload(cfg, histories));
}

export function listAgentIds(): string[] {
  return STRATEGY_CONFIGS.map((c) => c.agentId);
}
