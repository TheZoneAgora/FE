import type { TickerSymbol } from "@/lib/live/types";

// 서버 전용 — Binance 공개 klines(캔들) REST를 읽어 시그널 리플레이용 종가 시계열을
// 만든다. PriceFeed.ts(브라우저, 실시간 틱 폴링)와는 별개 모듈이다: 여기는 CORS
// 걱정이 없는 서버에서, "최근 N분간 실제로 어떻게 움직였는지" 과거 구간을 통째로
// 받아와 전략을 처음부터 재생하는 데 쓴다.

export const KLINES_INTERVAL = "1m";
export const KLINES_LIMIT = 120; // 1분봉 120개 = 2시간, 전 전략의 최대 lookback(20)보다 충분히 김

// api.binance.com은 미국 리전 IP를 지역 차단한다(HTTP 451/403) — Vercel Hobby 플랜은
// 서버리스 함수 리전을 고정할 수 없어(항상 미국) 서버에서 호출하면 이 차단에 걸린다.
// api.binance.us(같은 klines 응답 스키마, 4개 심볼 전부 상장)를 폴백으로 둬서
// 어느 리전에서 뜨든 안전하게 만든다.
const KLINES_ENDPOINTS = [
  { source: "binance" as const, base: "https://api.binance.com/api/v3/klines" },
  { source: "binance_us" as const, base: "https://api.binance.us/api/v3/klines" },
];

export interface KlinesResult {
  symbol: TickerSymbol;
  closes: number[];
  source: "binance" | "binance_us";
}

/** 심볼 하나의 최근 종가 시계열(시간순)을 가져온다. 두 엔드포인트 다 실패하면 던진다. */
async function fetchKlines(symbol: TickerSymbol): Promise<KlinesResult> {
  let lastError: unknown;
  for (const endpoint of KLINES_ENDPOINTS) {
    try {
      const url = `${endpoint.base}?symbol=${symbol}&interval=${KLINES_INTERVAL}&limit=${KLINES_LIMIT}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`${endpoint.source} klines 요청 실패 (${symbol}): HTTP ${res.status}`);
      }
      const rows = (await res.json()) as unknown[];
      // 각 row: [openTime, open, high, low, close, volume, closeTime, ...]
      const closes = rows.map((row) => Number((row as unknown[])[4]));
      if (closes.length === 0 || closes.some((v) => Number.isNaN(v))) {
        throw new Error(`${endpoint.source} klines 응답 파싱 실패 (${symbol})`);
      }
      return { symbol, closes, source: endpoint.source };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`klines 요청 실패 (${symbol})`);
}

/**
 * 여러 심볼의 klines를 중복 없이 병렬로 가져온다 (zephyr가 SUIUSDT+BTCUSDT 둘 다
 * 필요한 것처럼, 여러 에이전트가 같은 심볼을 요구할 수 있어 한 번씩만 호출한다).
 */
export async function fetchKlinesForSymbols(
  symbols: TickerSymbol[]
): Promise<Partial<Record<TickerSymbol, number[]>>> {
  const unique = Array.from(new Set(symbols));
  const results = await Promise.all(unique.map((s) => fetchKlines(s)));
  const out: Partial<Record<TickerSymbol, number[]>> = {};
  for (const r of results) out[r.symbol] = r.closes;
  return out;
}
