import type { LiveStrategyKind, SignalSide, TickerSymbol } from "@/lib/live/types";

// LiveStrategyEngine(브라우저 싱글턴)과 시그널 API(app/api/signals, 서버·스테이트리스)가
// 공유하는 순수 함수 모음. 두 곳이 같은 상수/공식을 쓰지 않으면 화면에 보여주는 것과
// 진웅에게 내려주는 API 응답이 서서히 달라질 수 있어 여기 한 곳으로만 정의한다.

export const ALL_SYMBOLS: TickerSymbol[] = ["SUIUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT"];

export const INITIAL_CAPITAL = 10_000;
export const FEE_BPS = 10;
export const HISTORY_MAX = 60;

export const RISK_LIMIT_BPS = 7000;
export const DEVIATION_LIMIT_BPS = 500; // 5%
export const GRID_STEP = 0.006; // 0.6%
export const MOMENTUM_SHORT = 5;
export const MOMENTUM_LONG = 20;
export const CONTRARIAN_LOOKBACK = 4;
export const CONTRARIAN_THRESHOLD = 0.012; // 1.2%
export const BREAKOUT_LOOKBACK = 20;
export const STABLE_ARB_MA_WINDOW = 10;
export const STABLE_ARB_DEVIATION_ENTRY = 0.003; // 0.3%
export const STABLE_ARB_DEVIATION_EXIT = 0.001; // 0.1%
export const STABLE_ARB_COOLDOWN_TICKS = 6; // 저빈도 유지용 최소 대기 틱 수

export interface StrategyConfig {
  agentId: string;
  strategy: LiveStrategyKind;
  symbol: TickerSymbol;
}

// mint를 포함해 5개 시드 에이전트(lib/data/seed/seasons.ts) 전부 여기 매핑된 전략을
// 실시간 시세에 그대로 적용한다 — "MINT만 real, 나머지는 mock"이 아니라 다섯 다
// 같은 방식(실시세 반응 페이퍼 트레이딩)이라는 게 이 파일이 존재하는 이유다.
export const STRATEGY_CONFIGS: StrategyConfig[] = [
  { agentId: "axiom", strategy: "momentum", symbol: "BTCUSDT" },
  { agentId: "mint", strategy: "contrarian", symbol: "SUIUSDT" },
  { agentId: "atlas", strategy: "grid", symbol: "ETHUSDT" },
  { agentId: "delphi", strategy: "breakout", symbol: "SOLUSDT" },
  { agentId: "zephyr", strategy: "stable-arb", symbol: "SUIUSDT" },
];

export const POSITION_FRACTION: Record<LiveStrategyKind, number> = {
  momentum: 0.5,
  contrarian: 0.5,
  grid: 0.4,
  breakout: 0.5,
  "stable-arb": 0.2,
};

// 전략별 기준 위험도(bps) + 최근 변동성 + 잡음을 합산해 리스크 점수를 만든다.
// base~2000-2800 + volTerm(0~1500) + noise(0~5000 균등분포) 조합은 리젝률이
// 대략 15~25% 대역에 오도록 역산한 근사치이며, 실거래 데이터로 보정된 값은 아니다.
export const STRATEGY_BASE_RISK_BPS: Record<LiveStrategyKind, number> = {
  momentum: 2600,
  breakout: 2800,
  grid: 2000,
  contrarian: 2200,
  "stable-arb": 1800,
};

export interface StrategyExtra {
  cooldownTicks: number;
  anchorPrice: number | null;
}

export interface VerifyResult {
  verdict: "VERIFIED" | "REJECTED";
  riskScoreBps: number;
  reason?: string;
}

export function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  const window = values.slice(-n);
  return window.reduce((a, b) => a + b, 0) / n;
}

export function pctChangeOverLookback(values: number[], n: number): number | null {
  if (values.length < n + 1) return null;
  const past = values[values.length - 1 - n];
  const current = values[values.length - 1];
  if (!past) return null;
  return (current - past) / past;
}

export function computeVolatilityBps(prices: number[], lookback = 10): number {
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

export function computeDeviationBps(prices: number[], lookback = 20): number {
  const ma = sma(prices, lookback);
  const current = prices[prices.length - 1];
  if (ma === null || current === undefined || ma === 0) return 0;
  return Math.abs((current - ma) / ma) * 10_000;
}

// noise가 Math.random()이라 verifySignal은 순수함수가 아니다 — 호출부(엔진 틱/리플레이)
// 양쪽 다 "그 시점에 검증했다면 통과했을 확률적 근사"를 받아들이고 쓴다는 전제.
export function computeRiskScoreBps(strategy: LiveStrategyKind, prices: number[]): number {
  const base = STRATEGY_BASE_RISK_BPS[strategy];
  const volTerm = Math.min(1500, computeVolatilityBps(prices) * 60);
  const noise = Math.random() * 5000;
  return Math.round(Math.min(10_000, Math.max(0, base + volTerm + noise)));
}

export function verifySignal(strategy: LiveStrategyKind, prices: number[]): VerifyResult {
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

export function decideMomentum(prices: number[], hasPosition: boolean): SignalSide | null {
  const short = sma(prices, MOMENTUM_SHORT);
  const long = sma(prices, MOMENTUM_LONG);
  if (short === null || long === null) return null;
  if (!hasPosition && short > long) return "BUY";
  if (hasPosition && short < long) return "SELL";
  return null;
}

export function decideContrarian(prices: number[], hasPosition: boolean): SignalSide | null {
  const change = pctChangeOverLookback(prices, CONTRARIAN_LOOKBACK);
  if (change === null) return null;
  if (!hasPosition && change <= -CONTRARIAN_THRESHOLD) return "BUY";
  if (hasPosition && change >= CONTRARIAN_THRESHOLD) return "SELL";
  return null;
}

export function decideBreakout(prices: number[], hasPosition: boolean): SignalSide | null {
  if (prices.length < BREAKOUT_LOOKBACK + 1) return null;
  const current = prices[prices.length - 1];
  const window = prices.slice(-(BREAKOUT_LOOKBACK + 1), -1);
  const high = Math.max(...window);
  const low = Math.min(...window);
  if (!hasPosition && current > high) return "BUY";
  if (hasPosition && current < low) return "SELL";
  return null;
}

export interface GridPositionLike {
  entryPrice: number;
}

export function decideGrid(
  extra: StrategyExtra,
  hasPosition: boolean,
  position: GridPositionLike | null,
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

export function decideStableArb(
  histories: Partial<Record<TickerSymbol, number[]>>,
  extra: StrategyExtra,
  hasPosition: boolean
): SignalSide | null {
  if (extra.cooldownTicks > 0) return null;
  const suiHist = histories.SUIUSDT ?? [];
  const btcHist = histories.BTCUSDT ?? [];
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

/** 이 전략을 판정하려면 어떤 심볼(들)의 가격 시계열이 필요한지. stable-arb는
 *  SUI/BTC 비율을 보므로 cfg.symbol 하나만으로는 부족하다. */
export function requiredSymbolsFor(cfg: StrategyConfig): TickerSymbol[] {
  if (cfg.strategy === "stable-arb") return ["SUIUSDT", "BTCUSDT"];
  return [cfg.symbol];
}

/** 전략 종류에 따라 적절한 decide* 함수로 분기하는 단일 진입점. */
export function decide(
  cfg: StrategyConfig,
  extra: StrategyExtra,
  hasPosition: boolean,
  position: GridPositionLike | null,
  currentPrice: number,
  histories: Partial<Record<TickerSymbol, number[]>>
): SignalSide | null {
  const prices = histories[cfg.symbol] ?? [];
  switch (cfg.strategy) {
    case "momentum":
      return decideMomentum(prices, hasPosition);
    case "contrarian":
      return decideContrarian(prices, hasPosition);
    case "breakout":
      return decideBreakout(prices, hasPosition);
    case "grid":
      return decideGrid(extra, hasPosition, position, currentPrice);
    case "stable-arb":
      return decideStableArb(histories, extra, hasPosition);
    default:
      return null;
  }
}
