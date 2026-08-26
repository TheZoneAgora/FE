import { getPriceFeed } from "@/lib/live/PriceFeed";
import {
  ALL_SYMBOLS,
  FEE_BPS,
  HISTORY_MAX,
  INITIAL_CAPITAL,
  POSITION_FRACTION,
  STABLE_ARB_COOLDOWN_TICKS,
  STRATEGY_CONFIGS,
  decide,
  verifySignal,
  type StrategyConfig,
  type StrategyExtra,
} from "@/lib/live/strategyLogic";
import type {
  ActivityEvent,
  EngineSnapshot,
  EngineTick,
  LiveAgentState,
  LivePosition,
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
// 전략 상수·판정 로직은 lib/live/strategyLogic.ts에만 정의한다 — app/api/signals가
// 같은 로직을 서버에서 재사용(실시간 klines 리플레이)하므로, 화면에 보여주는 것과
// API로 내려주는 시그널이 서서히 달라지는 걸 막기 위함이다.
//
// 참고: 여기서는 페이퍼 포지션/PnL만 계산한다.
// MINT의 "실데이터"(과거 시즌 곡선 스냅샷) 자체는 lib/data/AgentDataSource.ts가 유지한다.

const EQUITY_SERIES_MAX = 500;
const EVENTS_MAX = 200;
const STORAGE_KEY = "agora-live-engine-v1";
const STORAGE_VERSION = 1;

interface FillResult {
  fillPrice: number;
  quantity: number;
  feeBps: number;
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

    const hasPosition = runtime.position !== null;
    const side = decide(cfg, extra, hasPosition, runtime.position, price, this.histories);
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
