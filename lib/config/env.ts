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
