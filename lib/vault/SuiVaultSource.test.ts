import { describe, expect, it } from "vitest";

import {
  changedTradeLimits,
  isRaisingLimits,
  parseAgentStatus,
} from "@/lib/vault/SuiVaultSource";
import { DEFAULT_RISK_POLICY } from "@/lib/vault/types";
import type { RiskPolicy } from "@/lib/vault/types";

// investment_vault.move의 UserVault.agora_agent_status는 u8 하나다.
// 예전 구현은 is_paused 같은 boolean 필드를 찾다가 전부 undefined를 읽고
// 실제 상태와 무관하게 항상 PAUSED를 표시했다. 그 회귀를 막는다.
describe("parseAgentStatus", () => {
  it("u8 코드를 상태로 옮긴다", () => {
    expect(parseAgentStatus(0)).toBe("ACTIVE");
    expect(parseAgentStatus(1)).toBe("REDUCE_ONLY");
    expect(parseAgentStatus(2)).toBe("PAUSED");
  });

  it("JSON-RPC가 문자열로 줘도 같게 읽는다", () => {
    // 체인 조회 응답에서 "0" 과 "0.0" 을 모두 관측했다.
    expect(parseAgentStatus("0")).toBe("ACTIVE");
    expect(parseAgentStatus("0.0")).toBe("ACTIVE");
    expect(parseAgentStatus("1")).toBe("REDUCE_ONLY");
    expect(parseAgentStatus("2.0")).toBe("PAUSED");
  });

  it("읽을 수 없으면 ACTIVE로 낙관하지 않고 PAUSED로 둔다", () => {
    // 거래 중인데 멈춘 것처럼 보이는 쪽이, 멈췄는데 도는 것처럼 보이는 쪽보다 안전하다.
    expect(parseAgentStatus(undefined)).toBe("PAUSED");
    expect(parseAgentStatus(null)).toBe("PAUSED");
    expect(parseAgentStatus("정체불명")).toBe("PAUSED");
    expect(parseAgentStatus(99)).toBe("PAUSED");
  });
});

const policy = (overrides: Partial<RiskPolicy> = {}): RiskPolicy => ({
  ...DEFAULT_RISK_POLICY,
  maxTradeAmount: 500_000n,
  maxEpochTradeAmount: 1_000_000n,
  maxCryptoSellAmount: 20_000_000n,
  maxEpochCryptoSellAmount: 40_000_000n,
  ...overrides,
});

// 이 넷은 configure_execution_policy의 인자가 아니라 update_trade_limit 계열
// 별도 함수다. 예전에는 아예 전송되지 않아 설정 저장이 조용히 실패했다.
describe("changedTradeLimits", () => {
  it("바뀐 것이 없으면 undefined를 준다", () => {
    // 안 바뀐 값까지 매번 호출하면 트랜잭션만 커진다.
    expect(changedTradeLimits(policy(), policy())).toBeUndefined();
  });

  it("바뀐 항목만 골라낸다", () => {
    const changed = changedTradeLimits(
      policy(),
      policy({ maxTradeAmount: 700_000n })
    );

    expect(changed).toEqual({ maxTradeAmount: 700_000n });
  });

  it("네 종류 모두 추적한다", () => {
    const changed = changedTradeLimits(
      policy(),
      policy({
        maxTradeAmount: 1n,
        maxEpochTradeAmount: 2n,
        maxCryptoSellAmount: 3n,
        maxEpochCryptoSellAmount: 4n,
      })
    );

    expect(changed).toEqual({
      maxTradeAmount: 1n,
      maxEpochTradeAmount: 2n,
      maxCryptoSellAmount: 3n,
      maxEpochCryptoSellAmount: 4n,
    });
  });

  it("정책의 다른 필드가 바뀐 것은 한도로 취급하지 않는다", () => {
    // maxDailyFiatVolume은 configure_execution_policy가 직접 받는 값이다.
    expect(
      changedTradeLimits(policy(), policy({ maxDailyFiatVolume: 9n }))
    ).toBeUndefined();
  });
});

// 온체인이 "1회 한도 <= epoch 한도"를 요구하므로, 올릴 때는 epoch를 먼저 호출해야
// 중간 상태에서 abort하지 않는다. 방향 판정이 틀리면 정상 저장이 실패한다.
describe("isRaisingLimits", () => {
  it("하나라도 올리면 true", () => {
    expect(isRaisingLimits(policy(), { maxTradeAmount: 900_000n })).toBe(true);
  });

  it("모두 내리면 false", () => {
    expect(
      isRaisingLimits(policy(), {
        maxTradeAmount: 100_000n,
        maxEpochTradeAmount: 200_000n,
      })
    ).toBe(false);
  });

  it("내리는 것과 올리는 것이 섞이면 올리는 쪽을 따른다", () => {
    // epoch를 먼저 올려 두면 1회 한도를 내리는 호출은 어느 순서에서도 안전하다.
    expect(
      isRaisingLimits(policy(), {
        maxTradeAmount: 100_000n,
        maxEpochTradeAmount: 5_000_000n,
      })
    ).toBe(true);
  });

  it("바꿀 한도가 없으면 기본값 true", () => {
    expect(isRaisingLimits(policy(), undefined)).toBe(true);
  });
});
