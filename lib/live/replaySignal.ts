import {
  FEE_BPS,
  INITIAL_CAPITAL,
  POSITION_FRACTION,
  STABLE_ARB_COOLDOWN_TICKS,
  decide,
  verifySignal,
  type StrategyConfig,
  type StrategyExtra,
} from "@/lib/live/strategyLogic";
import type { Signal, SignalSide, TickerSymbol } from "@/lib/live/types";

// 서버(API route)에서 쓰는 스테이트리스 시그널 리플레이.
// 브라우저 LiveStrategyEngine은 세션 동안 틱을 누적하며 상태(포지션/자본)를 들고
// 있지만, 서버리스 API는 요청마다 다른 인스턴스에서 뜰 수 있어 그런 상태를 믿을 수
// 없다. 대신 매 요청마다 거래소 klines(과거 종가 시계열)를 받아 그 구간을 처음부터
// 끝까지 같은 전략 로직으로 재생(replay)해서 "지금 포지션이 뭐고, 마지막 판단
// 시그널이 뭐였는지"를 매번 새로 계산한다 — 완전히 결정론적이고 서버 상태가 필요
// 없다.

export interface SimPosition {
  quantity: number;
  entryPrice: number;
  baseEquityAtEntry: number;
}

export interface ReplaySignal extends Signal {
  /** 이 시그널이 관측된 시점의 klines 종가 배열 인덱스(디버그/재현용). */
  index: number;
}

export interface ReplayResult {
  agentId: string;
  strategy: StrategyConfig["strategy"];
  symbol: TickerSymbol;
  equity: number;
  roiPct: number;
  position: SimPosition | null;
  /** 리플레이 구간에서 발생한 시그널 전체(수신→검증/거부 판정 포함), 오래된 순. */
  signals: ReplaySignal[];
}

function openPosition(equity: number, price: number, strategy: StrategyConfig["strategy"]) {
  const fraction = POSITION_FRACTION[strategy];
  const notional = equity * fraction;
  const feeCost = notional * (FEE_BPS / 10_000);
  const baseEquityAtEntry = equity - feeCost;
  const quantity = notional / price;
  return { position: { quantity, entryPrice: price, baseEquityAtEntry }, equity: baseEquityAtEntry };
}

function closePosition(position: SimPosition, price: number) {
  const realized = position.quantity * (price - position.entryPrice);
  const feeCost = position.quantity * price * (FEE_BPS / 10_000);
  return position.baseEquityAtEntry + realized - feeCost;
}

let idCounter = 0;
function nextSignalId(agentId: string, index: number): string {
  idCounter += 1;
  // 같은 (agentId, klines 인덱스) 조합이면 항상 같은 접두부가 나오도록 해서, 폴링 시
  // "같은 판단을 반복 조회"와 "새 판단이 나왔다"를 신호 소비 측(AgoraAgent)이 구분할
  // 여지를 준다. 인덱스는 klines 개수에 종속되므로 완전한 안정성은 klines 파라미터를
  // 고정했을 때만 보장된다 — 그래서 API가 limit/interval을 고정값으로 쓴다.
  return `sig-${agentId}-${index}-${idCounter}`;
}

/**
 * cfg가 필요로 하는 심볼(들)의 종가 시계열을 처음부터 끝까지 재생해 현재 포지션과
 * 전체 시그널 이력을 계산한다. histories는 시간순 정렬된 종가 배열이어야 한다.
 */
export function replayStrategy(
  cfg: StrategyConfig,
  histories: Partial<Record<TickerSymbol, number[]>>
): ReplayResult {
  const prices = histories[cfg.symbol] ?? [];
  const extra: StrategyExtra = { cooldownTicks: 0, anchorPrice: null };
  let equity = INITIAL_CAPITAL;
  let position: SimPosition | null = null;
  const signals: ReplaySignal[] = [];

  // decide()가 참조하는 히스토리는 "그 시점까지"만 보여야 미래 데이터를 훔쳐보지
  // 않는다. 그래서 매 인덱스마다 슬라이스해서 넘긴다.
  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const upToNow: Partial<Record<TickerSymbol, number[]>> = {};
    for (const key of Object.keys(histories) as TickerSymbol[]) {
      upToNow[key] = histories[key]!.slice(0, i + 1);
    }

    if (extra.cooldownTicks > 0) extra.cooldownTicks -= 1;

    const hasPosition = position !== null;
    const side: SignalSide | null = decide(cfg, extra, hasPosition, position, price, upToNow);
    if (!side) continue;

    const verdict = verifySignal(cfg.strategy, upToNow[cfg.symbol] ?? []);
    const signal: ReplaySignal = {
      id: nextSignalId(cfg.agentId, i),
      agentId: cfg.agentId,
      strategy: cfg.strategy,
      side,
      symbol: cfg.symbol,
      price,
      riskScoreBps: verdict.riskScoreBps,
      timestamp: Date.now() - (prices.length - 1 - i) * 60_000, // 1분봉 가정 근사치
      verdict: verdict.verdict,
      rejectReason: verdict.reason,
      index: i,
    };
    signals.push(signal);

    if (verdict.verdict === "REJECTED") continue;

    if (side === "BUY") {
      const opened = openPosition(equity, price, cfg.strategy);
      position = opened.position;
      equity = opened.equity;
    } else if (position) {
      equity = closePosition(position, price);
      position = null;
      if (cfg.strategy === "stable-arb") extra.cooldownTicks = STABLE_ARB_COOLDOWN_TICKS;
    }
  }

  // 열린 포지션은 마지막 관측가로 시가평가해 현재 자본에 반영한다.
  const lastPrice = prices[prices.length - 1];
  const markedEquity =
    position && lastPrice !== undefined
      ? position.baseEquityAtEntry + position.quantity * (lastPrice - position.entryPrice)
      : equity;

  return {
    agentId: cfg.agentId,
    strategy: cfg.strategy,
    symbol: cfg.symbol,
    equity: markedEquity,
    roiPct: ((markedEquity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100,
    position,
    signals,
  };
}
