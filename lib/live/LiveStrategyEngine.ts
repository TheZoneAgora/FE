import { getPriceFeed } from "@/lib/live/PriceFeed";
import type {
  ActivityEvent,
  EngineSnapshot,
  EngineTick,
  LiveAgentState,
  LivePosition,
  LiveStrategyKind,
  OrderExecutedEvent,
  PriceTick,
  Signal,
  SignalRejectedEvent,
  SignalReceivedEvent,
  SignalSide,
  SignalVerifiedEvent,
  TickerSymbol,
} from "@/lib/live/types";

// 실시세(PriceFeed)에 반응하는 싱글턴 페이퍼 트레이딩 엔진.
// 시드 에이전트 5종(lib/data/seed/seasons.ts) 각각을 라이브 전략 1개에 매핑한다:
//
//   axiom  (crypto, 고확신 모멘텀)      -> momentum   / BTCUSDT  단기·장기 이평 돌파
//   mint   (real 데이터 유지, 안정적)    -> contrarian / SUIUSDT  급등매도·급락매수(역발상 = 변동성을 눌러 완만한 곡선)
//   atlas  (stocks, 꾸준한 복리)         -> grid       / ETHUSDT  그리드 레벨 저가매수·고가익절
//   delphi (polymarket, 이벤트성 점프)   -> breakout   / SOLUSDT  최근 N틱 고점/저점 돌파
//   zephyr (weather-arb, 저변동 그라인드) -> stable-arb / SUI·BTC 페어 저빈도 소액 신호
//
// 참고: LiveStrategyEngine은 여기서 다루는 페이퍼 포지션/PnL만 계산한다.
// MINT의 "실데이터" 자체(시즌 곡선)는 lib/data/AgentDataSource.ts 쪽 별도 소스가 유지한다.

const ALL_SYMBOLS: TickerSymbol[] = ["SUIUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT"];

const INITIAL_CAPITAL = 10_000;
const FEE_BPS = 10;
const HISTORY_MAX = 60;
const EQUITY_SERIES_MAX = 500;
const EVENTS_MAX = 200;
const STORAGE_KEY = "agora-live-engine-v1";
const STORAGE_VERSION = 1;

const RISK_LIMIT_BPS = 7000;
const DEVIATION_LIMIT_BPS = 500; // 5%
const GRID_STEP = 0.006; // 0.6%
const MOMENTUM_SHORT = 5;
const MOMENTUM_LONG = 20;
const CONTRARIAN_LOOKBACK = 4;
const CONTRARIAN_THRESHOLD = 0.012; // 1.2%
const BREAKOUT_LOOKBACK = 20;
const STABLE_ARB_MA_WINDOW = 10;
const STABLE_ARB_DEVIATION_ENTRY = 0.003; // 0.3%
const STABLE_ARB_DEVIATION_EXIT = 0.001; // 0.1%
const STABLE_ARB_COOLDOWN_TICKS = 6; // 저빈도 유지용 최소 대기 틱 수

interface StrategyConfig {
  agentId: string;
  strategy: LiveStrategyKind;
  symbol: TickerSymbol;
}

const STRATEGY_CONFIGS: StrategyConfig[] = [
  { agentId: "axiom", strategy: "momentum", symbol: "BTCUSDT" },
  { agentId: "mint", strategy: "contrarian", symbol: "SUIUSDT" },
  { agentId: "atlas", strategy: "grid", symbol: "ETHUSDT" },
  { agentId: "delphi", strategy: "breakout", symbol: "SOLUSDT" },
  { agentId: "zephyr", strategy: "stable-arb", symbol: "SUIUSDT" },
];

const POSITION_FRACTION: Record<LiveStrategyKind, number> = {
  momentum: 0.5,
  contrarian: 0.5,
  grid: 0.4,
  breakout: 0.5,
  "stable-arb": 0.2,
};

// 전략별 기준 위험도(bps) + 최근 변동성 + 잡음을 합산해 리스크 점수를 만든다.
// base~2000-2800 + volTerm(0~1500) + noise(0~5000 균등분포) 조합은 리젝률이
// 대략 15~25% 대역에 오도록 역산한 근사치이며, 실거래 데이터로 보정된 값은 아니다.
const STRATEGY_BASE_RISK_BPS: Record<LiveStrategyKind, number> = {
  momentum: 2600,
  breakout: 2800,
  grid: 2000,
  contrarian: 2200,
  "stable-arb": 1800,
};

interface StrategyExtra {
  cooldownTicks: number;
  anchorPrice: number | null;
}

interface VerifyResult {
  verdict: "VERIFIED" | "REJECTED";
  riskScoreBps: number;
  reason?: string;
}

interface FillResult {
  fillPrice: number;
  quantity: number;
  feeBps: number;
}

function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  const window = values.slice(-n);
  return window.reduce((a, b) => a + b, 0) / n;
}

function pctChangeOverLookback(values: number[], n: number): number | null {
  if (values.length < n + 1) return null;
  const past = values[values.length - 1 - n];
  const current = values[values.length - 1];
  if (!past) return null;
  return (current - past) / past;
}

function computeVolatilityBps(prices: number[], lookback = 10): number {
  if (prices.length < lookback + 1) return 0;
  const window = prices.slice(-(lookback + 1));
  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1];
    if (prev === 0) continue;
    returns.push((window[i] - prev) / prev);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 10_000;
}

function computeDeviationBps(prices: number[], lookback = 20): number {
  const ma = sma(prices, lookback);
  const current = prices[prices.length - 1];
  if (ma === null || current === undefined || ma === 0) return 0;
  return Math.abs((current - ma) / ma) * 10_000;
}

function computeRiskScoreBps(strategy: LiveStrategyKind, prices: number[]): number {
  const base = STRATEGY_BASE_RISK_BPS[strategy];
  const volTerm = Math.min(1500, computeVolatilityBps(prices) * 60);
  const noise = Math.random() * 5000;
  return Math.round(Math.min(10_000, Math.max(0, base + volTerm + noise)));
}

function verifySignal(strategy: LiveStrategyKind, prices: number[]): VerifyResult {
  const riskScoreBps = computeRiskScoreBps(strategy, prices);
  if (riskScoreBps > RISK_LIMIT_BPS) {
    return { verdict: "REJECTED", riskScoreBps, reason: "위험도 상한 초과" };
  }
  const deviationBps = computeDeviationBps(prices);
  if (deviationBps > DEVIATION_LIMIT_BPS) {
    return {
      verdict: "REJECTED",
      riskScoreBps,
      reason: `가격 편차 임계치 초과 (기준가 대비 ${(deviationBps / 100).toFixed(2)}%)`,
    };
  }
  return { verdict: "VERIFIED", riskScoreBps };
}

function decideMomentum(prices: number[], hasPosition: boolean): SignalSide | null {
  const short = sma(prices, MOMENTUM_SHORT);
  const long = sma(prices, MOMENTUM_LONG);
  if (short === null || long === null) return null;
  if (!hasPosition && short > long) return "BUY";
  if (hasPosition && short < long) return "SELL";
  return null;
}

function decideContrarian(prices: number[], hasPosition: boolean): SignalSide | null {
  const change = pctChangeOverLookback(prices, CONTRARIAN_LOOKBACK);
  if (change === null) return null;
  if (!hasPosition && change <= -CONTRARIAN_THRESHOLD) return "BUY";
  if (hasPosition && change >= CONTRARIAN_THRESHOLD) return "SELL";
  return null;
}

function decideBreakout(prices: number[], hasPosition: boolean): SignalSide | null {
  if (prices.length < BREAKOUT_LOOKBACK + 1) return null;
  const current = prices[prices.length - 1];
  const window = prices.slice(-(BREAKOUT_LOOKBACK + 1), -1);
  const high = Math.max(...window);
  const low = Math.min(...window);
  if (!hasPosition && current > high) return "BUY";
  if (hasPosition && current < low) return "SELL";
  return null;
}

function decideGrid(
  extra: StrategyExtra,
  hasPosition: boolean,
  position: LivePosition | null,
  currentPrice: number
): SignalSide | null {
  if (extra.anchorPrice === null) {
    extra.anchorPrice = currentPrice; // 최초 관측가를 그리드 기준가로 설정
    return null;
  }
  if (!hasPosition) {
    if (currentPrice <= extra.anchorPrice * (1 - GRID_STEP)) {
      extra.anchorPrice = currentPrice; // 다음 그리드 레벨을 이 가격 기준으로 재설정
      return "BUY";
    }
    if (currentPrice >= extra.anchorPrice * (1 + GRID_STEP)) {
      // 매수 없이 그리드 상단을 이탈 — 추세 상승으로 보고 기준가만 재중심화
      extra.anchorPrice = currentPrice;
    }
    return null;
  }
  if (position && currentPrice >= position.entryPrice * (1 + GRID_STEP)) {
    return "SELL";
  }
  return null;
}

function decideStableArb(
  histories: Record<TickerSymbol, number[]>,
  extra: StrategyExtra,
  hasPosition: boolean
): SignalSide | null {
  if (extra.cooldownTicks > 0) return null;
  const suiHist = histories.SUIUSDT;
  const btcHist = histories.BTCUSDT;
  const len = Math.min(suiHist.length, btcHist.length);
  if (len < STABLE_ARB_MA_WINDOW + 1) return null;

  const ratios: number[] = [];
  for (let i = 0; i < len; i++) {
    const sui = suiHist[suiHist.length - len + i];
    const btc = btcHist[btcHist.length - len + i];
    if (btc === 0) continue;
    ratios.push(sui / btc);
  }
  const ma = sma(ratios, STABLE_ARB_MA_WINDOW);
  const current = ratios[ratios.length - 1];
  if (ma === null || current === undefined || ma === 0) return null;

  const deviation = (current - ma) / ma;
  if (!hasPosition && deviation <= -STABLE_ARB_DEVIATION_ENTRY) return "BUY";
  if (hasPosition && deviation >= STABLE_ARB_DEVIATION_EXIT) return "SELL";
  return null;
}

function openPosition(
  runtime: LiveAgentState,
  cfg: StrategyConfig,
  price: number
): FillResult {
  const fraction = POSITION_FRACTION[cfg.strategy];
  const notional = runtime.equity * fraction;
  const feeCost = notional * (FEE_BPS / 10_000);
  const baseEquityAtEntry = runtime.equity - feeCost;
  const quantity = notional / price;
  runtime.position = {
    symbol: cfg.symbol,
    quantity,
    entryPrice: price,
    baseEquityAtEntry,
    openedAt: Date.now(),
  };
  runtime.equity = baseEquityAtEntry;
  return { fillPrice: price, quantity, feeBps: FEE_BPS };
}

function closePosition(runtime: LiveAgentState, price: number): FillResult {
  const position = runtime.position;
  if (!position) {
    throw new Error("포지션이 없는 상태에서 청산 신호를 처리했습니다.");
  }
  const realized = position.quantity * (price - position.entryPrice);
  const feeCost = position.quantity * price * (FEE_BPS / 10_000);
  runtime.equity = position.baseEquityAtEntry + realized - feeCost;
  runtime.position = null;
  return { fillPrice: price, quantity: position.quantity, feeBps: FEE_BPS };
}

interface PersistedAgentState {
  agentId: string;
  equity: number;
  roiPct: number;
  position: LivePosition | null;
  equitySeries: LiveAgentState["equitySeries"];
  lastSignal: Signal | null;
}

interface PersistedShape {
  version: number;
  agents: PersistedAgentState[];
  events: ActivityEvent[];
}

type EngineListener = (tick: EngineTick) => void;

class LiveStrategyEngineImpl {
  private readonly states = new Map<string, LiveAgentState>();
  private readonly extras = new Map<string, StrategyExtra>();
  private readonly histories: Record<TickerSymbol, number[]> = {
    SUIUSDT: [],
    BTCUSDT: [],
    ETHUSDT: [],
    SOLUSDT: [],
  };
  private events: ActivityEvent[] = [];
  private readonly listeners = new Set<EngineListener>();
  private started = false;
  private idCounter = 0;
  private lastTick: PriceTick | null = null;

  constructor() {
    for (const cfg of STRATEGY_CONFIGS) {
      this.states.set(cfg.agentId, {
        agentId: cfg.agentId,
        strategy: cfg.strategy,
        symbol: cfg.symbol,
        equity: INITIAL_CAPITAL,
        roiPct: 0,
        position: null,
        equitySeries: [],
        lastSignal: null,
      });
      this.extras.set(cfg.agentId, { cooldownTicks: 0, anchorPrice: null });
    }
  }

  subscribe(cb: EngineListener): () => void {
    this.listeners.add(cb);
    this.ensureStarted();
    return () => {
      this.listeners.delete(cb);
    };
  }

  getSnapshot(): EngineSnapshot {
    return {
      agents: STRATEGY_CONFIGS.map((cfg) =>
        this.cloneState(this.states.get(cfg.agentId)!)
      ),
      events: [...this.events],
      prices: this.lastTick
        ? { ...this.lastTick.prices }
        : ({} as Record<TickerSymbol, number>),
      priceSource: this.lastTick?.source ?? "simulated",
      updatedAt: this.lastTick?.timestamp ?? Date.now(),
    };
  }

  private ensureStarted(): void {
    if (this.started) return;
    if (typeof window === "undefined") return; // SSR 가드
    this.started = true;
    this.restore();
    getPriceFeed().subscribe((tick) => this.onPriceTick(tick));
  }

  private onPriceTick(priceTick: PriceTick): void {
    this.lastTick = priceTick;
    this.updateHistories(priceTick.prices);

    const newEvents: ActivityEvent[] = [];
    for (const cfg of STRATEGY_CONFIGS) {
      this.processAgentTick(cfg, priceTick, newEvents);
    }

    this.events.push(...newEvents);
    if (this.events.length > EVENTS_MAX) {
      this.events.splice(0, this.events.length - EVENTS_MAX);
    }

    this.persist();
    this.emit(priceTick, newEvents);
  }

  private processAgentTick(
    cfg: StrategyConfig,
    priceTick: PriceTick,
    newEvents: ActivityEvent[]
  ): void {
    const runtime = this.states.get(cfg.agentId)!;
    const extra = this.extras.get(cfg.agentId)!;
    const price = priceTick.prices[cfg.symbol];
    if (price === undefined) return;

    // 보유 중이면 매 틱 시가평가로 손익을 갱신한다.
    if (runtime.position) {
      runtime.equity =
        runtime.position.baseEquityAtEntry +
        runtime.position.quantity * (price - runtime.position.entryPrice);
    }
    if (cfg.strategy === "stable-arb" && extra.cooldownTicks > 0) {
      extra.cooldownTicks -= 1;
    }

    const side = this.decide(cfg, runtime, extra, price);
    if (side) {
      const signal = this.createSignal(cfg, side, price);
      newEvents.push(this.buildSignalReceivedEvent(signal));

      const verdict = verifySignal(cfg.strategy, this.histories[cfg.symbol]);
      signal.riskScoreBps = verdict.riskScoreBps;
      signal.verdict = verdict.verdict;
      signal.rejectReason = verdict.reason;
      runtime.lastSignal = signal;

      if (verdict.verdict === "REJECTED") {
        newEvents.push(this.buildSignalRejectedEvent(signal, verdict.reason!));
      } else {
        newEvents.push(this.buildSignalVerifiedEvent(signal));
        const fill =
          side === "BUY"
            ? openPosition(runtime, cfg, price)
            : closePosition(runtime, price);
        newEvents.push(this.buildOrderExecutedEvent(signal, fill));
        if (cfg.strategy === "stable-arb") {
          extra.cooldownTicks = STABLE_ARB_COOLDOWN_TICKS;
        }
      }
    }

    runtime.roiPct = ((runtime.equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
    runtime.equitySeries.push({ ts: priceTick.timestamp, equity: runtime.equity });
    if (runtime.equitySeries.length > EQUITY_SERIES_MAX) {
      runtime.equitySeries.shift();
    }
  }

  private decide(
    cfg: StrategyConfig,
    runtime: LiveAgentState,
    extra: StrategyExtra,
    currentPrice: number
  ): SignalSide | null {
    const prices = this.histories[cfg.symbol];
    const hasPosition = runtime.position !== null;
    switch (cfg.strategy) {
      case "momentum":
        return decideMomentum(prices, hasPosition);
      case "contrarian":
        return decideContrarian(prices, hasPosition);
      case "breakout":
        return decideBreakout(prices, hasPosition);
      case "grid":
        return decideGrid(extra, hasPosition, runtime.position, currentPrice);
      case "stable-arb":
        return decideStableArb(this.histories, extra, hasPosition);
      default:
        return null;
    }
  }

  private updateHistories(prices: Record<TickerSymbol, number>): void {
    for (const symbol of ALL_SYMBOLS) {
      const value = prices[symbol];
      if (value === undefined) continue;
      const arr = this.histories[symbol];
      arr.push(value);
      if (arr.length > HISTORY_MAX) arr.shift();
    }
  }

  private emit(priceTick: PriceTick, newEvents: ActivityEvent[]): void {
    const tick: EngineTick = {
      agents: STRATEGY_CONFIGS.map((cfg) =>
        this.cloneState(this.states.get(cfg.agentId)!)
      ),
      events: newEvents,
      prices: { ...priceTick.prices },
      priceSource: priceTick.source,
      timestamp: priceTick.timestamp,
    };
    this.listeners.forEach((cb) => cb(tick));
  }

  private cloneState(state: LiveAgentState): LiveAgentState {
    return {
      ...state,
      position: state.position ? { ...state.position } : null,
      equitySeries: [...state.equitySeries],
      lastSignal: state.lastSignal ? { ...state.lastSignal } : null,
    };
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${Date.now()}-${this.idCounter}`;
  }

  private createSignal(cfg: StrategyConfig, side: SignalSide, price: number): Signal {
    return {
      id: this.nextId("sig"),
      agentId: cfg.agentId,
      strategy: cfg.strategy,
      side,
      symbol: cfg.symbol,
      price,
      riskScoreBps: 0,
      timestamp: Date.now(),
      verdict: "PENDING",
    };
  }

  private buildSignalReceivedEvent(signal: Signal): SignalReceivedEvent {
    return {
      id: this.nextId("evt"),
      type: "SIGNAL_RECEIVED",
      agentId: signal.agentId,
      signalId: signal.id,
      timestamp: signal.timestamp,
      side: signal.side,
      symbol: signal.symbol,
      price: signal.price,
    };
  }

  private buildSignalVerifiedEvent(signal: Signal): SignalVerifiedEvent {
    return {
      id: this.nextId("evt"),
      type: "SIGNAL_VERIFIED",
      agentId: signal.agentId,
      signalId: signal.id,
      timestamp: Date.now(),
      side: signal.side,
      symbol: signal.symbol,
      price: signal.price,
      riskScoreBps: signal.riskScoreBps,
    };
  }

  private buildSignalRejectedEvent(signal: Signal, reason: string): SignalRejectedEvent {
    return {
      id: this.nextId("evt"),
      type: "SIGNAL_REJECTED",
      agentId: signal.agentId,
      signalId: signal.id,
      timestamp: Date.now(),
      side: signal.side,
      symbol: signal.symbol,
      price: signal.price,
      riskScoreBps: signal.riskScoreBps,
      reason,
    };
  }

  private buildOrderExecutedEvent(signal: Signal, fill: FillResult): OrderExecutedEvent {
    return {
      id: this.nextId("evt"),
      type: "ORDER_EXECUTED",
      agentId: signal.agentId,
      signalId: signal.id,
      timestamp: Date.now(),
      side: signal.side,
      symbol: signal.symbol,
      fillPrice: fill.fillPrice,
      quantity: fill.quantity,
      feeBps: fill.feeBps,
    };
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      const payload: PersistedShape = {
        version: STORAGE_VERSION,
        agents: STRATEGY_CONFIGS.map((cfg) => {
          const s = this.states.get(cfg.agentId)!;
          return {
            agentId: s.agentId,
            equity: s.equity,
            roiPct: s.roiPct,
            position: s.position,
            equitySeries: s.equitySeries,
            lastSignal: s.lastSignal,
          };
        }),
        events: this.events,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 지속성 없이 계속 동작한다.
    }
  }

  private restore(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedShape;
      if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.agents)) {
        return;
      }
      for (const saved of parsed.agents) {
        const runtime = this.states.get(saved.agentId);
        if (!runtime) continue;
        runtime.equity = saved.equity;
        runtime.roiPct = saved.roiPct;
        runtime.position = saved.position ?? null;
        runtime.equitySeries = Array.isArray(saved.equitySeries)
          ? saved.equitySeries
          : [];
        runtime.lastSignal = saved.lastSignal ?? null;

        const extra = this.extras.get(saved.agentId);
        if (extra && runtime.position) {
          // 재개 직후 어색한 즉시 매수/매도를 막기 위해 그리드 기준가를 진입가로 복원.
          extra.anchorPrice = runtime.position.entryPrice;
        }
      }
      if (Array.isArray(parsed.events)) {
        this.events = parsed.events.slice(-EVENTS_MAX);
      }
    } catch {
      // 손상된 저장값은 무시하고 기본 상태로 시작한다.
    }
  }
}

let singleton: LiveStrategyEngineImpl | null = null;

export function getLiveStrategyEngine(): LiveStrategyEngineImpl {
  if (!singleton) singleton = new LiveStrategyEngineImpl();
  return singleton;
}

export type LiveStrategyEngine = LiveStrategyEngineImpl;
