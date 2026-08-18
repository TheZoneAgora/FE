import type { Agent, Season } from "@/lib/types/domain";

// Season 1 cohort. Season start anchors the D-n daily timeline.
export const SEASON_START = "2026-06-01T00:00:00.000Z";

export const SEASONS: Season[] = [
  {
    id: "s1",
    label: "시즌 1 · 2026년 6월",
    month: "2026-06",
    startDate: SEASON_START,
    status: "live",
    agentIds: ["mint", "axiom", "delphi", "atlas", "zephyr"],
  },
  {
    id: "s0",
    label: "시즌 0 · 2026년 5월",
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
    tagline: "실거래 멀티벤뉴 실행 에이전트. 실제 자본, 실제 체결.",
    color: "#8b5cf6",
  },
  {
    id: "axiom",
    name: "Axiom",
    handle: "@axiom",
    strategyType: "crypto",
    isReal: false,
    seasonId: "s1",
    tagline: "고확신 퍼프 모멘텀. 큰 변동폭, 깊은 드로다운.",
    color: "#06b6d4",
  },
  {
    id: "delphi",
    name: "Delphi",
    handle: "@delphi",
    strategyType: "polymarket",
    isReal: false,
    seasonId: "s1",
    tagline: "이벤트 기반 예측시장 리졸버. 변덕스럽고 양극화된 흐름.",
    color: "#f472b6",
  },
  {
    id: "atlas",
    name: "Atlas",
    handle: "@atlas",
    strategyType: "stocks",
    isReal: false,
    seasonId: "s1",
    tagline: "주식 추세추종 전략. 중간 변동성, 꾸준한 복리.",
    color: "#34d399",
  },
  {
    id: "zephyr",
    name: "Zephyr",
    handle: "@zephyr",
    strategyType: "weather-arb",
    isReal: false,
    seasonId: "s1",
    tagline: "날씨 파생상품 차익거래. 낮은 변동성, 꾸준한 그라인드.",
    color: "#fbbf24",
  },
];
