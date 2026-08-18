// 라이브 레이어(실시세 기반 페이퍼 트레이딩) 공용 타입.
// PriceFeed, LiveStrategyEngine이 공유한다.

/** Binance/CoinGecko 폴링 대상 심볼. `Symbol`은 전역 빌트인과 충돌하므로 사용하지 않는다. */
export type TickerSymbol = "SUIUSDT" | "BTCUSDT" | "ETHUSDT" | "SOLUSDT";

export type PriceSource = "binance" | "coingecko" | "simulated";

export interface PriceTick {
  prices: Record<TickerSymbol, number>;
  source: PriceSource;
  timestamp: number;
}

/** 시드 에이전트 5종에 1:1 매핑되는 라이브 전략 종류. */
export type LiveStrategyKind =
  | "momentum"
  | "contrarian"
  | "grid"
  | "breakout"
  | "stable-arb";

export type SignalSide = "BUY" | "SELL";

export type SignalVerdict = "PENDING" | "VERIFIED" | "REJECTED";

export interface Signal {
  id: string;
  agentId: string;
  strategy: LiveStrategyKind;
  side: SignalSide;
  symbol: TickerSymbol;
  price: number;
  riskScoreBps: number;
  timestamp: number;
  verdict: SignalVerdict;
  rejectReason?: string;
}

export type ActivityEventType =
  | "SIGNAL_RECEIVED"
  | "SIGNAL_VERIFIED"
  | "SIGNAL_REJECTED"
  | "ORDER_EXECUTED";

interface ActivityEventBase {
  id: string;
  agentId: string;
  signalId: string;
  timestamp: number;
}

export interface SignalReceivedEvent extends ActivityEventBase {
  type: "SIGNAL_RECEIVED";
  side: SignalSide;
  symbol: TickerSymbol;
  price: number;
}

export interface SignalVerifiedEvent extends ActivityEventBase {
  type: "SIGNAL_VERIFIED";
  side: SignalSide;
  symbol: TickerSymbol;
  price: number;
  riskScoreBps: number;
}

export interface SignalRejectedEvent extends ActivityEventBase {
  type: "SIGNAL_REJECTED";
  side: SignalSide;
  symbol: TickerSymbol;
  price: number;
  riskScoreBps: number;
  reason: string;
}

export interface OrderExecutedEvent extends ActivityEventBase {
  type: "ORDER_EXECUTED";
  side: SignalSide;
  symbol: TickerSymbol;
  fillPrice: number;
  quantity: number;
  feeBps: number;
}

export type ActivityEvent =
  | SignalReceivedEvent
  | SignalVerifiedEvent
  | SignalRejectedEvent
  | OrderExecutedEvent;

/** 페이퍼 포지션. null이면 플랫(무포지션). */
export interface LivePosition {
  symbol: TickerSymbol;
  quantity: number;
  entryPrice: number;
  /** 포지션 오픈 시점의 (수수료 차감 후) 계좌 자본 — 청산 없이도 즉시 시가평가하기 위한 기준값. */
  baseEquityAtEntry: number;
  openedAt: number;
}

export interface EquityTickPoint {
  ts: number;
  equity: number;
}

export interface LiveAgentState {
  agentId: string;
  strategy: LiveStrategyKind;
  symbol: TickerSymbol;
  equity: number;
  roiPct: number;
  position: LivePosition | null;
  equitySeries: EquityTickPoint[];
  lastSignal: Signal | null;
}

/** subscribe(cb) 콜백에 매 틱 전달되는 델타 페이로드. */
export interface EngineTick {
  agents: LiveAgentState[];
  events: ActivityEvent[];
  prices: Record<TickerSymbol, number>;
  priceSource: PriceSource;
  timestamp: number;
}

/** getSnapshot()의 전체 상태 조회 결과. */
export interface EngineSnapshot {
  agents: LiveAgentState[];
  events: ActivityEvent[];
  prices: Record<TickerSymbol, number>;
  priceSource: PriceSource;
  updatedAt: number;
}
