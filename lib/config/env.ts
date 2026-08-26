// Env-driven config for the Sui vault integration. See .omc/specs/deep-interview-agora-vault-userside.md
export const AGENT_MARKET_PACKAGE_ID =
  process.env.NEXT_PUBLIC_AGENT_MARKET_PACKAGE_ID ??
  "0x7dcf1c6495682131bcf3a41d4723f7422ca4d49aadaed5d8bc9c2e4a683deb26";

export const AGORA_AGENT_OPERATOR = process.env.NEXT_PUBLIC_AGORA_AGENT_OPERATOR;

export const AGORA_FIAT_COIN_TYPE = process.env.NEXT_PUBLIC_AGORA_FIAT_COIN_TYPE;

export const AGORA_CRYPTO_COIN_TYPE =
  process.env.NEXT_PUBLIC_AGORA_CRYPTO_COIN_TYPE ?? "0x2::sui::SUI";

export type VaultMode = "mock" | "real";

const VAULT_MODE = (process.env.NEXT_PUBLIC_VAULT_MODE as VaultMode | undefined) ?? "mock";

// Real mode requires both the agent operator and fiat coin type to be configured;
// otherwise fall back to mock so the app never silently calls a misconfigured contract.
export function resolvedVaultMode(): VaultMode {
  if (VAULT_MODE === "real" && AGORA_AGENT_OPERATOR && AGORA_FIAT_COIN_TYPE) {
    return "real";
  }
  return "mock";
}

/** Agora가 체결 시점에 FiatT로 징수하는 거래 수수료 (bps).
 *  contract/sui-contract/sources/vault/trading_fee.move 의 TRADING_FEE_BPS와 같아야 한다.
 *  온체인 상수라 여기서 바꿔도 실제 징수액은 변하지 않는다 — 표시용이다. */
export const TRADING_FEE_BPS = 10;

/** 표시용 백분율 문자열. 10bps -> "0.1%" */
export function tradingFeePercentLabel(): string {
  return `${(TRADING_FEE_BPS / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** 체결 금액에 대한 수수료를 추정한다. 실제 청구는 온체인에서 내림으로 계산되므로
 *  표시값이 1 단위 어긋날 수 있다. 정확한 값은 이벤트의 fee_charged를 쓸 것. */
export function estimateTradingFee(amount: bigint): bigint {
  return (amount * BigInt(TRADING_FEE_BPS)) / 10_000n;
}
