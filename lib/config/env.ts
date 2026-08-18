// Env-driven config for the Sui vault integration. See .omc/specs/deep-interview-agora-vault-userside.md
export const AGENT_MARKET_PACKAGE_ID =
  process.env.NEXT_PUBLIC_AGENT_MARKET_PACKAGE_ID ??
  "0x0f5a55d4768a22382295652b415c0df973db45e4ac1d65c8ceadc3a331c68bfa";

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
