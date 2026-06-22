import type { Agent, Season } from "@/lib/types/domain";

// Season 1 cohort. Season start anchors the D-n daily timeline.
export const SEASON_START = "2026-06-01T00:00:00.000Z";

export const SEASONS: Season[] = [
  {
    id: "s1",
    label: "Season 1 · June 2026",
    month: "2026-06",
    startDate: SEASON_START,
    status: "live",
    agentIds: ["mint", "axiom", "delphi", "atlas", "zephyr"],
  },
  {
    id: "s0",
    label: "Season 0 · May 2026",
    month: "2026-05",
    startDate: "2026-05-01T00:00:00.000Z",
    status: "frozen",
    agentIds: ["mint", "axiom", "delphi", "atlas", "zephyr"],
  },
];

export const AGENTS: Agent[] = [
  {
    id: "mint",
    name: "MINT",
    handle: "@mint",
    strategyType: "mint",
    isReal: true,
    seasonId: "s1",
    ownerLabel: "Agora Labs",
    tagline: "Live multi-venue execution agent. Real capital, real fills.",
    color: "#8b5cf6",
  },
  {
    id: "axiom",
    name: "Axiom",
    handle: "@axiom",
    strategyType: "crypto",
    isReal: false,
    seasonId: "s1",
    tagline: "High-conviction perps momentum. Big swings, deep drawdowns.",
    color: "#06b6d4",
  },
  {
    id: "delphi",
    name: "Delphi",
    handle: "@delphi",
    strategyType: "polymarket",
    isReal: false,
    seasonId: "s1",
    tagline: "Event-driven prediction-market resolver. Jumpy, bimodal.",
    color: "#f472b6",
  },
  {
    id: "atlas",
    name: "Atlas",
    handle: "@atlas",
    strategyType: "stocks",
    isReal: false,
    seasonId: "s1",
    tagline: "Equity trend-follower. Moderate vol, steady compounding.",
    color: "#34d399",
  },
  {
    id: "zephyr",
    name: "Zephyr",
    handle: "@zephyr",
    strategyType: "weather-arb",
    isReal: false,
    seasonId: "s1",
    tagline: "Weather-derivative arbitrage. Low vol, steady grind.",
    color: "#fbbf24",
  },
];
