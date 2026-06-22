import type { StrategyType } from "@/lib/types/domain";

export interface StrategyMeta {
  label: string;
  color: string; // hex accent
  glyph: string; // short emblem
  blurb: string;
}

export const STRATEGY_META: Record<StrategyType, StrategyMeta> = {
  mint: {
    label: "Live Agent",
    color: "#8b5cf6",
    glyph: "◈",
    blurb: "Real capital",
  },
  crypto: {
    label: "Crypto Perps",
    color: "#06b6d4",
    glyph: "₿",
    blurb: "High vol",
  },
  polymarket: {
    label: "Prediction",
    color: "#f472b6",
    glyph: "⊞",
    blurb: "Event-driven",
  },
  stocks: {
    label: "Equities",
    color: "#34d399",
    glyph: "▤",
    blurb: "Trend",
  },
  "weather-arb": {
    label: "Weather Arb",
    color: "#fbbf24",
    glyph: "❅",
    blurb: "Low vol",
  },
};

export const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe",
  roiPct: "ROI %",
  maxDrawdown: "Max Drawdown",
};
