import { resolvedVaultMode } from "@/lib/config/env";
import { MockVaultSource } from "@/lib/vault/MockVaultSource";
import { SuiVaultSource } from "@/lib/vault/SuiVaultSource";
import type { VaultDataSource } from "@/lib/vault/VaultDataSource";

// mock/real 싱글턴 팩토리. lib/data/index.ts의 getDataSource() 패턴을 그대로 따른다.
let instance: VaultDataSource | null = null;

export function getVaultDataSource(): VaultDataSource {
  if (instance) return instance;
  instance =
    resolvedVaultMode() === "real" ? new SuiVaultSource() : new MockVaultSource();
  return instance;
}

export type {
  CreateVaultParams,
  EmergencyLiquidateAllParams,
  VaultDataEvent,
  VaultDataSource,
  VaultSubscriber,
} from "@/lib/vault/VaultDataSource";
export * from "@/lib/vault/types";
