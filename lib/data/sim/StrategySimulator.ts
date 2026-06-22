import type { EquityPoint, StrategyType } from "@/lib/types/domain";

// Deterministic seeded PRNG (mulberry32) -> reproducible curves.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Box-Muller standard normal.
function gauss(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Profile {
  dailyDrift: number; // mean daily return
  dailyVol: number; // daily stdev of return
  jumpProb?: number; // prob of an event jump (polymarket)
  jumpScale?: number; // magnitude of jump
  stepProb?: number; // prob of a step edge (weather-arb)
  stepScale?: number;
}

// Per-type bands tuned to the plan's differentiation table.
const PROFILES: Record<Exclude<StrategyType, "mint">, Profile> = {
  crypto: { dailyDrift: 0.0042, dailyVol: 0.052, jumpProb: 0.06, jumpScale: 0.07 },
  stocks: { dailyDrift: 0.0016, dailyVol: 0.013 },
  polymarket: {
    dailyDrift: 0.0009,
    dailyVol: 0.006,
    jumpProb: 0.16,
    jumpScale: 0.075,
  },
  "weather-arb": {
    dailyDrift: 0.0011,
    dailyVol: 0.0035,
    stepProb: 0.12,
    stepScale: 0.012,
  },
};

// MINT gets a deliberately solid, trustworthy-looking curve:
// steady positive drift, controlled vol, shallow drawdowns.
const MINT_PROFILE: Profile = { dailyDrift: 0.0028, dailyVol: 0.0095 };

export interface SimInput {
  agentId: string;
  strategyType: StrategyType;
  seasonId: string;
  startDate: string; // ISO
  days: number; // number of points (D0..D{days-1})
  initialCapital: number;
}

const cache = new Map<string, EquityPoint[]>();

export function simulateCurve(input: SimInput): EquityPoint[] {
  const key = `${input.seasonId}:${input.agentId}:${input.days}:${input.initialCapital}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const profile =
    input.strategyType === "mint"
      ? MINT_PROFILE
      : PROFILES[input.strategyType as Exclude<StrategyType, "mint">];

  const rnd = mulberry32(hashSeed(`${input.seasonId}:${input.agentId}`));
  const start = new Date(input.startDate).getTime();
  const dayMs = 86_400_000;

  const points: EquityPoint[] = [];
  let equity = input.initialCapital;

  for (let d = 0; d < input.days; d++) {
    if (d === 0) {
      // baseline at D0
      equity = input.initialCapital;
    } else {
      let ret = profile.dailyDrift + profile.dailyVol * gauss(rnd);

      if (profile.jumpProb && rnd() < profile.jumpProb) {
        // bimodal binary-resolution style jump (up or down)
        const dir = rnd() < 0.56 ? 1 : -1;
        ret += dir * profile.jumpScale! * (0.5 + rnd());
      }
      if (profile.stepProb && rnd() < profile.stepProb) {
        ret += profile.stepScale!; // small positive edge step
      }

      equity = equity * (1 + ret);
      // floor to avoid blowups in the prototype
      equity = Math.max(equity, input.initialCapital * 0.45);
    }

    const pnl = equity - input.initialCapital;
    points.push({
      dayIndex: d,
      ts: new Date(start + d * dayMs).toISOString(),
      equity: Math.round(equity * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      roiPct: Math.round((pnl / input.initialCapital) * 10000) / 100,
    });
  }

  cache.set(key, points);
  return points;
}
