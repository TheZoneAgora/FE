import type { PriceSource, PriceTick, TickerSymbol } from "@/lib/live/types";

// 클라이언트 전용 실시세 폴러: Binance -> CoinGecko -> 랜덤워크 순으로 폴백.
// 어떤 경우에도 구독자에게 틱이 멈추지 않는다 (SSR에서는 아예 시작하지 않음).

const SYMBOLS: TickerSymbol[] = ["SUIUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT"];

const BINANCE_URL = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
  JSON.stringify(SYMBOLS)
)}`;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=sui,bitcoin,ethereum,solana&vs_currencies=usd";

const COINGECKO_ID_TO_SYMBOL: Record<string, TickerSymbol> = {
  sui: "SUIUSDT",
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
};

// 네트워크가 완전히 막힌 최초 진입 시에만 쓰이는 시드 가격 (대략적인 기준가).
const SEED_PRICES: Record<TickerSymbol, number> = {
  SUIUSDT: 3.5,
  BTCUSDT: 65000,
  ETHUSDT: 3400,
  SOLUSDT: 150,
};

const POLL_INTERVAL_MS = 7000;
const RANDOM_WALK_PCT = 0.0005; // 틱당 ±0.05%

type Listener = (tick: PriceTick) => void;

function clonePrices(
  prices: Record<TickerSymbol, number>
): Record<TickerSymbol, number> {
  return { ...prices };
}

class PriceFeedImpl {
  private prices: Record<TickerSymbol, number> = clonePrices(SEED_PRICES);
  private source: PriceSource = "simulated";
  private readonly listeners = new Set<Listener>();
  private started = false;

  /** 구독 시작. 반환된 함수를 호출하면 구독 해제된다. */
  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    this.ensureStarted();
    // 신규 구독자가 다음 폴링까지(최대 7초) 기다리지 않도록 현재 스냅샷을 즉시 전달.
    cb(this.snapshot());
    return () => this.unsubscribe(cb);
  }

  unsubscribe(cb: Listener): void {
    this.listeners.delete(cb);
  }

  getSnapshot(): PriceTick {
    return this.snapshot();
  }

  private snapshot(): PriceTick {
    return {
      prices: clonePrices(this.prices),
      source: this.source,
      timestamp: Date.now(),
    };
  }

  private ensureStarted(): void {
    if (this.started) return;
    if (typeof window === "undefined") return; // SSR 가드
    this.started = true;
    void this.tick();
    setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  private emit(): void {
    const tick = this.snapshot();
    this.listeners.forEach((cb) => cb(tick));
  }

  private async tick(): Promise<void> {
    const fromBinance = await this.fetchBinance();
    if (fromBinance) {
      this.prices = fromBinance;
      this.source = "binance";
      this.emit();
      return;
    }

    const fromGecko = await this.fetchCoinGecko();
    if (fromGecko) {
      this.prices = fromGecko;
      this.source = "coingecko";
      this.emit();
      return;
    }

    this.prices = this.randomWalk();
    this.source = "simulated";
    this.emit();
  }

  private async fetchBinance(): Promise<Record<TickerSymbol, number> | null> {
    try {
      const res = await fetch(BINANCE_URL, { cache: "no-store" });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{
        symbol: string;
        price: string;
      }>;
      const next: Partial<Record<TickerSymbol, number>> = {};
      for (const row of rows) {
        if (!SYMBOLS.includes(row.symbol as TickerSymbol)) continue;
        const price = Number.parseFloat(row.price);
        if (Number.isFinite(price) && price > 0) {
          next[row.symbol as TickerSymbol] = price;
        }
      }
      return this.isComplete(next) ? next : null;
    } catch {
      return null;
    }
  }

  private async fetchCoinGecko(): Promise<Record<
    TickerSymbol,
    number
  > | null> {
    try {
      const res = await fetch(COINGECKO_URL, { cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as Record<string, { usd?: number }>;
      const next: Partial<Record<TickerSymbol, number>> = {};
      for (const [id, symbol] of Object.entries(COINGECKO_ID_TO_SYMBOL)) {
        const price = body[id]?.usd;
        if (typeof price === "number" && Number.isFinite(price) && price > 0) {
          next[symbol] = price;
        }
      }
      return this.isComplete(next) ? next : null;
    } catch {
      return null;
    }
  }

  private isComplete(
    partial: Partial<Record<TickerSymbol, number>>
  ): partial is Record<TickerSymbol, number> {
    return SYMBOLS.every((symbol) => partial[symbol] !== undefined);
  }

  private randomWalk(): Record<TickerSymbol, number> {
    const next = clonePrices(this.prices);
    for (const symbol of SYMBOLS) {
      const drift = (Math.random() * 2 - 1) * RANDOM_WALK_PCT;
      next[symbol] = Math.max(0.0001, next[symbol] * (1 + drift));
    }
    return next;
  }
}

let singleton: PriceFeedImpl | null = null;

export function getPriceFeed(): PriceFeedImpl {
  if (!singleton) singleton = new PriceFeedImpl();
  return singleton;
}

export type PriceFeed = PriceFeedImpl;
