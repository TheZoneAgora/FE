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
    // 전 시즌 참고용 실거래 스냅샷(6/23 종료, lib/data/mint/mint-real-data.json)을
    // 씨드로 삼되, 시즌 1부터는 다른 4개와 동일하게 SUI 실시간 시세에 반응하는
    // 페이퍼 트레이딩 시뮬레이션이다 — "실거래 중"이 아니라 "실데이터 기반 시뮬레이션".
    id: "mint",
    name: "MINT",
    handle: "@mint",
    strategyType: "mint",
    isReal: true,
    seasonId: "s1",
    ownerLabel: "Agora Labs",
    tagline: "SUI 실시간 시세 기반 역발상(컨트래리언) 페이퍼 트레이딩. 급락 매수 · 급등 매도.",
    color: "#8b5cf6",
  },
  {
    id: "axiom",
    name: "Axiom",
    handle: "@axiom",
    strategyType: "crypto",
    isReal: true,
    seasonId: "s1",
    tagline: "BTC 실시간 시세 기반 모멘텀 페이퍼 트레이딩. 단기 이동평균 교차 추종.",
    color: "#06b6d4",
  },
  {
    id: "delphi",
    name: "Delphi",
    handle: "@delphi",
    strategyType: "polymarket",
    isReal: true,
    seasonId: "s1",
    tagline: "SOL 실시간 시세 기반 돌파(브레이크아웃) 페이퍼 트레이딩. 최근 고점·저점 이탈 진입.",
    color: "#f472b6",
  },
  {
    id: "atlas",
    name: "Atlas",
    handle: "@atlas",
    strategyType: "stocks",
    isReal: true,
    seasonId: "s1",
    tagline: "ETH 실시간 시세 기반 그리드 페이퍼 트레이딩. 기준가 대비 구간마다 분할 매매.",
    color: "#34d399",
  },
  {
    id: "zephyr",
    name: "Zephyr",
    handle: "@zephyr",
    strategyType: "weather-arb",
    isReal: true,
    seasonId: "s1",
    tagline: "SUI/BTC 비율 기반 저빈도 차익 페이퍼 트레이딩. 평균 이탈 시에만 소액 진입.",
    color: "#fbbf24",
  },
];
