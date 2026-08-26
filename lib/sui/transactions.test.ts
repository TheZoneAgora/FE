import { describe, expect, it } from "vitest";

import { buildUpdateTradeLimitsTransaction } from "@/lib/sui/transactions";

const VAULT = "0x5dc2a80f4a49736dbbf6228839a0f5eb7a86f6e5c65dd7b85b4f8f3cc0f7c4b5";

/** 만들어진 Transaction에서 호출된 Move 함수 이름을 순서대로 뽑는다. */
function moveCallNames(transaction: {
  getData: () => { commands: unknown[] };
}): string[] {
  return transaction
    .getData()
    .commands.map((command) => {
      const call = (command as { MoveCall?: { function?: string } }).MoveCall;
      return call?.function;
    })
    .filter((name): name is string => typeof name === "string");
}

// 한도 4종은 configure_execution_policy가 받지 않아 별도 호출로 붙는다.
// 온체인이 "1회 한도 <= epoch 한도"를 요구하므로 호출 순서가 결과를 가른다.
describe("buildUpdateTradeLimitsTransaction", () => {
  it("값이 있는 한도만 호출한다", () => {
    const tx = buildUpdateTradeLimitsTransaction({
      vaultId: VAULT,
      limits: { maxTradeAmount: 700_000n },
    });

    expect(moveCallNames(tx)).toEqual(["update_trade_limit"]);
  });

  it("올릴 때는 epoch 한도를 먼저 올린다", () => {
    // 1회를 먼저 올리면 잠깐 "1회 > epoch" 상태가 되어 온체인에서 abort한다.
    const tx = buildUpdateTradeLimitsTransaction({
      vaultId: VAULT,
      limits: { maxTradeAmount: 900_000n, maxEpochTradeAmount: 2_000_000n },
      raising: true,
    });

    expect(moveCallNames(tx)).toEqual([
      "update_epoch_trade_limit",
      "update_trade_limit",
    ]);
  });

  it("내릴 때는 1회 한도를 먼저 내린다", () => {
    // 반대로 epoch를 먼저 내리면 그 순간 1회 한도가 더 커진다.
    const tx = buildUpdateTradeLimitsTransaction({
      vaultId: VAULT,
      limits: { maxTradeAmount: 100_000n, maxEpochTradeAmount: 200_000n },
      raising: false,
    });

    expect(moveCallNames(tx)).toEqual([
      "update_trade_limit",
      "update_epoch_trade_limit",
    ]);
  });

  it("crypto 매도 한도도 같은 규칙을 따른다", () => {
    const tx = buildUpdateTradeLimitsTransaction({
      vaultId: VAULT,
      limits: {
        maxCryptoSellAmount: 30_000_000n,
        maxEpochCryptoSellAmount: 60_000_000n,
      },
      raising: true,
    });

    expect(moveCallNames(tx)).toEqual([
      "update_epoch_crypto_sell_limit",
      "update_crypto_sell_limit",
    ]);
  });

  it("0은 거부한다", () => {
    // 온체인도 new_limit > 0을 요구한다. 서명 전에 끊어 가스를 버리지 않는다.
    expect(() =>
      buildUpdateTradeLimitsTransaction({
        vaultId: VAULT,
        limits: { maxTradeAmount: 0n },
      })
    ).toThrow();
  });
});
