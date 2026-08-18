// real 모드 VaultDataSource 구현.
// @mysten/dapp-kit@1.1.17이 실제로 useSuiClient()에서 반환하는 타입은 @mysten/sui@2.26.1의
// 고전 SuiClient가 아니라 @mysten/sui/jsonRpc의 SuiJsonRpcClient다 (JSON-RPC API는 v2에서
// deprecated 표시되었지만 dapp-kit 1.1.17은 여전히 이 클라이언트를 쓴다. 확인:
// node_modules/@mysten/dapp-kit/dist/hooks/useSuiClient.d.ts).
import type { Transaction } from "@mysten/sui/transactions";
import {
  getJsonRpcFullnodeUrl,
  SuiJsonRpcClient,
  type SuiObjectResponse,
} from "@mysten/sui/jsonRpc";

import { DEFAULT_RISK_POLICY } from "@/lib/vault/types";
import type {
  AgentStatus,
  ExecutionPolicyUpdate,
  RiskPolicy,
  VaultState,
} from "@/lib/vault/types";
import type {
  CreateVaultParams,
  EmergencyLiquidateAllParams,
  VaultDataEvent,
  VaultDataSource,
  VaultSubscriber,
} from "@/lib/vault/VaultDataSource";
import {
  buildConfigureExecutionPolicyTransaction,
  buildCreateVaultTransaction,
  buildDeepBookEmergencyLiquidateAllTransaction,
  buildDepositMoreTransaction,
  buildEmergencyPauseAndWithdrawFiatTransaction,
  buildReactivateAgentTransaction,
  buildRevokeAgentTransaction,
  buildSetReduceOnlyTransaction,
  buildWithdrawAllTransaction,
  buildWithdrawAmountTransaction,
} from "@/lib/sui/transactions";

const VAULT_ID_STORAGE_KEY = "agora-vault-id";

// UI(dApp Kit signAndExecuteTransaction)가 지갑 서명 후 돌려주는 결과의 최소 형태.
// objectChanges는 훅 호출 시 옵션으로 요청해야 채워진다 — 없으면 vaultId 자동감지를 생략한다.
export interface SignAndExecuteResult {
  digest: string;
  objectChanges?: Array<{
    type: string;
    objectType?: string;
    objectId?: string;
  }>;
}

export type SignAndExecuteFn = (
  transaction: Transaction
) => Promise<SignAndExecuteResult>;

// getObject만 있으면 되므로 SuiJsonRpcClient 전체가 아니라 구조적으로 필요한 만큼만 요구한다.
export interface MinimalSuiObjectClient {
  getObject(input: {
    id: string;
    options?: { showContent?: boolean };
  }): Promise<SuiObjectResponse>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Move Balance<T>({ fields: { value } })와 평범한 u64 문자열/숫자를 모두 bigint로 통일한다.
// UserVault.move 원본 소스가 없어 정확한 필드 shape를 100% 확신할 수 없으므로 방어적으로 파싱한다.
function unwrapMoveNumeric(value: unknown, label: string): bigint {
  if (value === null || value === undefined) {
    if (isBrowser()) {
      console.warn(
        `[SuiVaultSource] Move field "${label}" was not found on-chain; defaulting to 0.`
      );
    }
    return 0n;
  }
  if (typeof value === "string" || typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "object") {
    const nested = value as { fields?: { value?: unknown }; value?: unknown };
    if (nested.fields && "value" in nested.fields) {
      return unwrapMoveNumeric(nested.fields.value, label);
    }
    if ("value" in nested) {
      return unwrapMoveNumeric((nested as { value: unknown }).value, label);
    }
  }
  throw new Error(`Unable to parse Move field "${label}": ${JSON.stringify(value)}`);
}

function unwrapMoveBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function readField(
  fields: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (key in fields) return fields[key];
  }
  return undefined;
}

// 정책 필드가 UserVault에 flat하게 있는지, execution_policy 서브 struct로 감싸져 있는지도
// 확실치 않아 둘 다 시도한다.
function extractPolicyContainer(
  fields: Record<string, unknown>
): Record<string, unknown> {
  for (const key of ["policy", "execution_policy", "risk_policy"]) {
    const candidate = fields[key];
    if (
      candidate &&
      typeof candidate === "object" &&
      "fields" in (candidate as object)
    ) {
      return (candidate as { fields: Record<string, unknown> }).fields;
    }
  }
  return fields;
}

// getObject({showContent:true}) 응답의 Move struct fields를 VaultState로 매핑한다.
function parseVaultFields(
  fields: Record<string, unknown>,
  vaultId: string
): VaultState {
  const policyFields = extractPolicyContainer(fields);

  const isPaused = unwrapMoveBoolean(readField(fields, "is_paused", "paused"));
  const isReduceOnly = unwrapMoveBoolean(
    readField(fields, "is_reduce_only", "reduce_only")
  );
  const isActive = unwrapMoveBoolean(
    readField(
      fields,
      "is_agora_agent_active",
      "agora_agent_active",
      "is_active"
    )
  );

  const agentStatus: AgentStatus = isPaused
    ? "PAUSED"
    : isReduceOnly
      ? "REDUCE_ONLY"
      : isActive
        ? "ACTIVE"
        : "PAUSED";

  const ownerField = readField(fields, "owner");

  const policy: RiskPolicy = {
    maxTradeAmount: unwrapMoveNumeric(
      readField(fields, "max_trade_amount"),
      "max_trade_amount"
    ),
    maxEpochTradeAmount: unwrapMoveNumeric(
      readField(fields, "max_epoch_trade_amount"),
      "max_epoch_trade_amount"
    ),
    maxCryptoSellAmount: unwrapMoveNumeric(
      readField(fields, "max_crypto_sell_amount"),
      "max_crypto_sell_amount"
    ),
    maxEpochCryptoSellAmount: unwrapMoveNumeric(
      readField(fields, "max_epoch_crypto_sell_amount"),
      "max_epoch_crypto_sell_amount"
    ),
    maxDailyFiatVolume: unwrapMoveNumeric(
      readField(policyFields, "max_daily_fiat_volume"),
      "max_daily_fiat_volume"
    ),
    maxLossAmount: unwrapMoveNumeric(
      readField(policyFields, "max_loss_amount"),
      "max_loss_amount"
    ),
    maxRiskScoreBps: Number(
      unwrapMoveNumeric(
        readField(policyFields, "max_risk_score_bps"),
        "max_risk_score_bps"
      )
    ),
    lossWindowMs: Number(
      unwrapMoveNumeric(readField(policyFields, "loss_window_ms"), "loss_window_ms")
    ),
    maxWindowLossAmount: unwrapMoveNumeric(
      readField(policyFields, "max_window_loss_amount", "max_window_loss"),
      "max_window_loss_amount"
    ),
    maxPriceDeviationBps: Number(
      unwrapMoveNumeric(
        readField(policyFields, "max_price_deviation_bps"),
        "max_price_deviation_bps"
      )
    ),
    maxSignalDelayMs: Number(
      unwrapMoveNumeric(
        readField(policyFields, "max_signal_delay_ms"),
        "max_signal_delay_ms"
      )
    ),
    maxPositionSize: unwrapMoveNumeric(
      readField(policyFields, "max_position_size"),
      "max_position_size"
    ),
  };

  return {
    vaultId,
    owner: typeof ownerField === "string" ? ownerField : null,
    fiatBalance: unwrapMoveNumeric(
      readField(fields, "fiat_balance"),
      "fiat_balance"
    ),
    cryptoBalance: unwrapMoveNumeric(
      readField(fields, "crypto_balance"),
      "crypto_balance"
    ),
    agentStatus,
    policy,
    realizedLoss: unwrapMoveNumeric(
      readField(fields, "realized_loss_amount", "realized_loss"),
      "realized_loss_amount"
    ),
    windowLoss: unwrapMoveNumeric(
      readField(fields, "window_loss_amount", "window_loss"),
      "window_loss_amount"
    ),
    dailyVolume: unwrapMoveNumeric(
      readField(fields, "daily_fiat_volume", "daily_volume"),
      "daily_fiat_volume"
    ),
    isGuest: false,
  };
}

/**
 * Sui Testnet 온체인 UserVault를 다루는 VaultDataSource 구현.
 * 트랜잭션 서명은 UI 레이어(dApp Kit useSignAndExecuteTransaction)가 setSignAndExecute로
 * 주입하는 콜백에 위임한다 — 이 클래스는 지갑 상태를 모른다.
 */
export class SuiVaultSource implements VaultDataSource {
  private readonly client: MinimalSuiObjectClient;
  private signAndExecute: SignAndExecuteFn | null = null;
  private vaultId: string | null;
  private readonly listeners = new Set<VaultSubscriber>();

  constructor(client?: MinimalSuiObjectClient) {
    this.client =
      client ??
      new SuiJsonRpcClient({
        url: getJsonRpcFullnodeUrl("testnet"),
        network: "testnet",
      });
    this.vaultId = this.loadVaultId();
  }

  /** UI 레이어가 지갑 연결 후 서명 콜백을 주입한다. 연결 해제 시 null로 되돌린다. */
  setSignAndExecute(fn: SignAndExecuteFn | null): void {
    this.signAndExecute = fn;
  }

  /** createVault 자동감지가 실패했을 때를 위한 수동 vault ID 입력 폴백. */
  setVaultId(vaultId: string): void {
    this.vaultId = vaultId;
    if (isBrowser()) {
      window.localStorage.setItem(VAULT_ID_STORAGE_KEY, vaultId);
    }
  }

  getVaultId(): string | null {
    return this.vaultId;
  }

  private loadVaultId(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(VAULT_ID_STORAGE_KEY);
  }

  private requireVaultId(): string {
    if (!this.vaultId) {
      throw new Error(
        "Vault ID is not set. Create a vault first, or call setVaultId() manually."
      );
    }
    return this.vaultId;
  }

  private requireSigner(): SignAndExecuteFn {
    if (!this.signAndExecute) {
      throw new Error(
        "No signAndExecute callback attached. Call setSignAndExecute() from the wallet-connected UI layer first."
      );
    }
    return this.signAndExecute;
  }

  private async fetchVaultState(vaultId: string): Promise<VaultState> {
    const response = await this.client.getObject({
      id: vaultId,
      options: { showContent: true },
    });

    if (response.error) {
      throw new Error(
        `Failed to fetch vault ${vaultId}: ${JSON.stringify(response.error)}`
      );
    }

    const content = response.data?.content;
    if (!content || content.dataType !== "moveObject") {
      throw new Error(`Vault object ${vaultId} has no Move content.`);
    }

    return parseVaultFields(
      content.fields as Record<string, unknown>,
      vaultId
    );
  }

  private notify(owner: string | null, state: VaultState): void {
    const event: VaultDataEvent = { owner, state };
    this.listeners.forEach((callback) => callback(event));
  }

  private async refreshAndNotify(owner: string): Promise<VaultState> {
    const state = await this.getVaultState(owner);
    this.notify(owner, state);
    return state;
  }

  async hasVault(owner: string): Promise<boolean> {
    void owner; // real 모드는 1지갑 1볼트를 vaultId로 식별하지, owner로 조회하지 않는다.
    if (!this.vaultId) return false;
    try {
      await this.fetchVaultState(this.vaultId);
      return true;
    } catch {
      return false;
    }
  }

  async getVaultState(owner: string): Promise<VaultState> {
    const state = await this.fetchVaultState(this.requireVaultId());
    if (state.owner && state.owner !== owner) {
      console.warn(
        `[SuiVaultSource] Vault owner mismatch: expected ${owner}, found ${state.owner}.`
      );
    }
    return state;
  }

  async createVault(
    owner: string,
    params: CreateVaultParams
  ): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildCreateVaultTransaction({
      depositAmount: params.depositAmount,
      maxTradeAmount: DEFAULT_RISK_POLICY.maxTradeAmount,
      maxEpochTradeAmount: DEFAULT_RISK_POLICY.maxEpochTradeAmount,
      maxCryptoSellAmount: DEFAULT_RISK_POLICY.maxCryptoSellAmount,
      maxEpochCryptoSellAmount: DEFAULT_RISK_POLICY.maxEpochCryptoSellAmount,
    });

    const result = await signer(tx);
    const createdVaultId = result.objectChanges?.find(
      (change) =>
        change.type === "created" && change.objectType?.includes("UserVault")
    )?.objectId;

    if (!createdVaultId) {
      throw new Error(
        "Vault created but its object ID could not be auto-detected from the transaction result " +
          `(digest: ${result.digest}). Look it up on a Sui explorer and call setVaultId() manually.`
      );
    }
    this.setVaultId(createdVaultId);

    return this.refreshAndNotify(owner);
  }

  async depositMore(owner: string, amount: bigint): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildDepositMoreTransaction({
      vaultId: this.requireVaultId(),
      amount,
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async withdrawAmount(owner: string, amount: bigint): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildWithdrawAmountTransaction({
      vaultId: this.requireVaultId(),
      amount,
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async withdrawAll(owner: string): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildWithdrawAllTransaction({ vaultId: this.requireVaultId() });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async revokeAgent(owner: string): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildRevokeAgentTransaction({ vaultId: this.requireVaultId() });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async reactivateAgent(owner: string): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildReactivateAgentTransaction({
      vaultId: this.requireVaultId(),
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async setReduceOnly(owner: string, reduceOnly: boolean): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildSetReduceOnlyTransaction({
      vaultId: this.requireVaultId(),
      reduceOnly,
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async configurePolicy(
    owner: string,
    policy: ExecutionPolicyUpdate
  ): Promise<VaultState> {
    if (!policy.allowedPool) {
      // allowedPool은 VaultState.policy(RiskPolicy)에 저장되지 않는 값이라 이전 상태에서
      // 복원할 수 없다 — configure_execution_policy 호출마다 명시적으로 받아야 한다.
      throw new Error(
        "allowedPool is required to submit configure_execution_policy in real mode."
      );
    }

    const signer = this.requireSigner();
    const current = await this.getVaultState(owner);
    const merged: RiskPolicy = { ...current.policy, ...policy };

    const tx = buildConfigureExecutionPolicyTransaction({
      vaultId: this.requireVaultId(),
      allowedPool: policy.allowedPool,
      maxDailyFiatVolume: merged.maxDailyFiatVolume,
      maxPositionSize: merged.maxPositionSize,
      maxLossAmount: merged.maxLossAmount,
      tradingStartMinuteUtc: policy.tradingStartMinuteUtc ?? 0,
      tradingEndMinuteUtc: policy.tradingEndMinuteUtc ?? 0,
      maxSignalDelayMs: merged.maxSignalDelayMs,
      maxPriceDeviationBps: merged.maxPriceDeviationBps,
      maxRiskScoreBps: merged.maxRiskScoreBps,
      lossWindowMs: merged.lossWindowMs,
      maxWindowLossAmount: merged.maxWindowLossAmount,
    });

    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async emergencyLiquidateAll(
    owner: string,
    params: EmergencyLiquidateAllParams
  ): Promise<VaultState> {
    if (!params.poolId || !params.deepFeeCoinId) {
      throw new Error(
        "poolId and deepFeeCoinId are required for emergencyLiquidateAll in real mode."
      );
    }

    const signer = this.requireSigner();
    const tx = buildDeepBookEmergencyLiquidateAllTransaction({
      vaultId: this.requireVaultId(),
      poolId: params.poolId,
      deepFeeCoinId: params.deepFeeCoinId,
      minFiatOutput: params.minFiatOutput,
      deadlineMs: params.deadlineMs ?? Date.now() + 60_000,
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  async emergencyPauseAndWithdraw(owner: string): Promise<VaultState> {
    const signer = this.requireSigner();
    const tx = buildEmergencyPauseAndWithdrawFiatTransaction({
      vaultId: this.requireVaultId(),
    });
    await signer(tx);
    return this.refreshAndNotify(owner);
  }

  subscribe(callback: VaultSubscriber): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
