import {
  DEFAULT_RISK_POLICY,
  type ExecutionPolicyUpdate,
  type VaultActivityEvent,
  type VaultActivityEventType,
  type VaultState,
} from "@/lib/vault/types";
import type {
  CreateVaultParams,
  EmergencyLiquidateAllParams,
  VaultDataEvent,
  VaultDataSource,
  VaultSubscriber,
} from "@/lib/vault/VaultDataSource";

const STORAGE_KEY = "agora-mock-vault-v1";

// 실시세 콜백이 아직 붙지 않았을 때 쓰는 폴백 SUI/USDC 환율.
// attachEngine으로 엔진이 붙으면 이 값 대신 엔진의 실시세를 우선 사용한다.
const FALLBACK_CRYPTO_PRICE_USDC = 3.5;

// 활동 피드가 무한정 커지지 않도록 볼트당 유지할 최근 이벤트 개수.
const MAX_ACTIVITY_LENGTH = 200;

interface StoredVaultRecord {
  state: VaultState;
  activity: VaultActivityEvent[];
}

interface StoredData {
  guest: StoredVaultRecord;
  vaults: Record<string, StoredVaultRecord>;
}

/** LiveStrategyEngine의 ActivityEvent와 구조적으로 호환되는 최소 형태. */
interface EngineActivityLike {
  type?: string;
  agentId?: string;
  signalId?: string;
  side?: string;
  symbol?: string;
  price?: number;
  fillPrice?: number;
  quantity?: number;
  riskScoreBps?: number;
  reason?: string;
  timestamp?: number;
  [key: string]: unknown;
}

/** subscribe 콜백에는 개별 시그널이 아니라 EngineTick({events: [...]})이 온다. */
interface EngineTickLike {
  events?: EngineActivityLike[];
  [key: string]: unknown;
}

interface EngineLike {
  subscribe?: (callback: (tick: EngineTickLike) => void) => (() => void) | void;
  getLatestPrice?: (symbol: string) => number | undefined;
  getSnapshot?: () => { prices?: Record<string, number> } | undefined;
}

// bigint는 JSON.stringify가 다루지 못하므로 마커 객체로 감싸서 저장한다.
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? { __bigint__: value.toString() } : value;
}

function bigintReviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "__bigint__" in (value as Record<string, unknown>)
  ) {
    return BigInt((value as { __bigint__: string }).__bigint__);
  }
  return value;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(prefix: string): string {
  if (isBrowser() && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// 심사위원 등 지갑 미연결 방문자가 /vault에서 즉시 보는 사전 시드 데모 볼트.
function createGuestVaultRecord(): StoredVaultRecord {
  const now = Date.now();

  const state: VaultState = {
    vaultId: null,
    owner: null,
    fiatBalance: 6_420_000_000n, // 6,420 USDC
    cryptoBalance: 812_000_000_000n, // 812 SUI (MIST, 9 decimals)
    agentStatus: "ACTIVE",
    policy: { ...DEFAULT_RISK_POLICY },
    realizedLoss: 0n,
    windowLoss: 0n,
    dailyVolume: 320_000_000n, // 320 USDC
    isGuest: true,
  };

  const activity: VaultActivityEvent[] = [
    {
      id: "seed-1",
      type: "SignalReceived",
      timestamp: now - 9 * 60_000,
      payload: { side: "BUY", symbol: "SUIUSDT", price: 3.42 },
    },
    {
      id: "seed-2",
      type: "SignalVerified",
      timestamp: now - 9 * 60_000 + 5_000,
      payload: { side: "BUY", symbol: "SUIUSDT", price: 3.42, riskScoreBps: 2400 },
    },
    {
      id: "seed-3",
      type: "OrderExecuted",
      timestamp: now - 9 * 60_000 + 8_000,
      payload: { side: "BUY", symbol: "SUIUSDT", price: 3.42, amount: "50000000" },
    },
    {
      id: "seed-4",
      type: "SignalReceived",
      timestamp: now - 3 * 60_000,
      payload: { side: "SELL", symbol: "SUIUSDT", price: 3.5 },
    },
    {
      id: "seed-5",
      type: "SignalRejected",
      timestamp: now - 3 * 60_000 + 4_000,
      payload: {
        side: "SELL",
        symbol: "SUIUSDT",
        price: 3.5,
        reason: "max_risk_score_bps 초과",
      },
    },
  ];

  return { state, activity };
}

function createSeedData(): StoredData {
  return { guest: createGuestVaultRecord(), vaults: {} };
}

/**
 * localStorage("agora-mock-vault-v1") 지속 mock VaultDataSource.
 * 게스트 데모 볼트 + 지갑별 mock 볼트를 함께 관리한다 (1지갑 1볼트 가정).
 */
export class MockVaultSource implements VaultDataSource {
  private data: StoredData;
  private readonly listeners = new Set<VaultSubscriber>();
  private priceSource: (() => number) | null = null;
  private engineUnsubscribe: (() => void) | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): StoredData {
    if (!isBrowser()) {
      return createSeedData();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = createSeedData();
        this.data = seeded;
        this.persist();
        return seeded;
      }
      return JSON.parse(raw, bigintReviver) as StoredData;
    } catch {
      // 손상된 저장값은 신뢰하지 않고 새로 시드한다.
      const seeded = createSeedData();
      this.data = seeded;
      this.persist();
      return seeded;
    }
  }

  private persist(): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(this.data, bigintReplacer)
    );
  }

  private requireVault(owner: string): StoredVaultRecord {
    const record = this.data.vaults[owner];
    if (!record) {
      throw new Error(
        `No vault found for owner ${owner}. Call createVault first.`
      );
    }
    return record;
  }

  private appendActivity(
    record: StoredVaultRecord,
    type: VaultActivityEventType,
    payload: Record<string, unknown>
  ): VaultActivityEvent {
    const event: VaultActivityEvent = {
      id: generateId("evt"),
      type,
      timestamp: Date.now(),
      payload,
    };
    record.activity.push(event);
    if (record.activity.length > MAX_ACTIVITY_LENGTH) {
      record.activity.splice(0, record.activity.length - MAX_ACTIVITY_LENGTH);
    }
    return event;
  }

  private commit(
    owner: string | null,
    record: StoredVaultRecord,
    activity?: VaultActivityEvent
  ): void {
    this.persist();
    const event: VaultDataEvent = { owner, state: record.state, activity };
    this.listeners.forEach((callback) => callback(event));
  }

  async hasVault(owner: string): Promise<boolean> {
    return Boolean(this.data.vaults[owner]);
  }

  async getVaultState(owner: string): Promise<VaultState> {
    return this.requireVault(owner).state;
  }

  async getActivityHistory(owner: string | null): Promise<VaultActivityEvent[]> {
    const record = owner ? this.data.vaults[owner] : this.data.guest;
    if (!record) return [];
    // 저장은 시간순 push라 피드용으로는 최신순으로 뒤집어 준다.
    return [...record.activity].reverse();
  }

  async getGuestVault(): Promise<VaultState> {
    return this.data.guest.state;
  }

  async createVault(
    owner: string,
    params: CreateVaultParams
  ): Promise<VaultState> {
    if (this.data.vaults[owner]) {
      throw new Error(`Vault already exists for owner ${owner}.`);
    }
    if (params.depositAmount <= 0n) {
      throw new Error("depositAmount must be greater than zero.");
    }

    const state: VaultState = {
      vaultId: `mock-vault-${owner}`,
      owner,
      fiatBalance: params.depositAmount,
      cryptoBalance: 0n,
      agentStatus: "ACTIVE",
      policy: { ...DEFAULT_RISK_POLICY },
      realizedLoss: 0n,
      windowLoss: 0n,
      dailyVolume: 0n,
      isGuest: false,
    };

    const record: StoredVaultRecord = { state, activity: [] };
    this.data.vaults[owner] = record;
    this.commit(owner, record);
    return state;
  }

  async depositMore(owner: string, amount: bigint): Promise<VaultState> {
    if (amount <= 0n) throw new Error("amount must be greater than zero.");
    const record = this.requireVault(owner);
    record.state.fiatBalance += amount;
    const activity = this.appendActivity(record, "DepositReceived", {
      amount: amount.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async withdrawAmount(owner: string, amount: bigint): Promise<VaultState> {
    if (amount <= 0n) throw new Error("amount must be greater than zero.");
    const record = this.requireVault(owner);
    if (amount > record.state.fiatBalance) {
      throw new Error("amount exceeds fiatBalance.");
    }
    record.state.fiatBalance -= amount;
    const activity = this.appendActivity(record, "WithdrawalExecuted", {
      fiatWithdrawn: amount.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async withdrawCrypto(owner: string, amount: bigint): Promise<VaultState> {
    if (amount <= 0n) throw new Error("amount must be greater than zero.");
    const record = this.requireVault(owner);
    if (amount > record.state.cryptoBalance) {
      throw new Error("amount exceeds cryptoBalance.");
    }
    record.state.cryptoBalance -= amount;
    const activity = this.appendActivity(record, "WithdrawalExecuted", {
      cryptoWithdrawn: amount.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async withdrawAll(owner: string): Promise<VaultState> {
    const record = this.requireVault(owner);
    const withdrawnFiat = record.state.fiatBalance;
    const withdrawnCrypto = record.state.cryptoBalance;
    record.state.fiatBalance = 0n;
    record.state.cryptoBalance = 0n;
    const activity = this.appendActivity(record, "WithdrawalExecuted", {
      fiatWithdrawn: withdrawnFiat.toString(),
      cryptoWithdrawn: withdrawnCrypto.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async revokeAgent(owner: string): Promise<VaultState> {
    const record = this.requireVault(owner);
    record.state.agentStatus = "PAUSED";
    const activity = this.appendActivity(record, "AgentRevoked", {});
    this.commit(owner, record, activity);
    return record.state;
  }

  async reactivateAgent(owner: string): Promise<VaultState> {
    const record = this.requireVault(owner);
    record.state.agentStatus = "ACTIVE";
    const activity = this.appendActivity(record, "AgentReactivated", {});
    this.commit(owner, record, activity);
    return record.state;
  }

  async setReduceOnly(
    owner: string,
    reduceOnly: boolean
  ): Promise<VaultState> {
    const record = this.requireVault(owner);
    record.state.agentStatus = reduceOnly ? "REDUCE_ONLY" : "ACTIVE";
    const activity = this.appendActivity(record, "ReduceOnlyUpdated", {
      reduceOnly,
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async configurePolicy(
    owner: string,
    policy: ExecutionPolicyUpdate
  ): Promise<VaultState> {
    const record = this.requireVault(owner);
    // allowedPool/거래시간대는 real 모드 configure_execution_policy 트랜잭션 전용 값이라
    // mock VaultState.policy(RiskPolicy)에는 반영하지 않는다 — rest로만 분리해 버린다.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { allowedPool, tradingStartMinuteUtc, tradingEndMinuteUtc, ...riskFields } = policy;
    record.state.policy = { ...record.state.policy, ...riskFields };
    const activity = this.appendActivity(record, "PolicyUpdated", {
      changed: Object.keys(riskFields),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async emergencyLiquidateAll(
    owner: string,
    params: EmergencyLiquidateAllParams
  ): Promise<VaultState> {
    const record = this.requireVault(owner);
    const cryptoAmount = record.state.cryptoBalance;
    const price = this.resolveCryptoPrice();

    // cryptoAmount는 MIST(1e9 decimals), price는 SUI 1개당 USDC, fiat는 USDC 6 decimals.
    const fiatOut =
      (cryptoAmount * BigInt(Math.round(price * 1_000_000))) /
      1_000_000_000n;

    if (fiatOut < params.minFiatOutput) {
      throw new Error(
        "Simulated liquidation output is below minFiatOutput; aborted."
      );
    }

    // 실제 취득원가를 추적하지 않는 mock이라, 폴백 환율 대비 청산가가 낮았던 만큼만
    // realizedLoss로 근사 기록한다.
    const referenceFiatValue =
      (cryptoAmount *
        BigInt(Math.round(FALLBACK_CRYPTO_PRICE_USDC * 1_000_000))) /
      1_000_000_000n;
    const lossDelta =
      referenceFiatValue > fiatOut ? referenceFiatValue - fiatOut : 0n;

    record.state.cryptoBalance = 0n;
    record.state.fiatBalance += fiatOut;
    record.state.realizedLoss += lossDelta;
    record.state.agentStatus = "PAUSED";

    const activity = this.appendActivity(record, "EmergencyLiquidated", {
      cryptoLiquidated: cryptoAmount.toString(),
      fiatReceived: fiatOut.toString(),
      minFiatOutput: params.minFiatOutput.toString(),
      realizedLossDelta: lossDelta.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  async emergencyPauseAndWithdraw(owner: string): Promise<VaultState> {
    const record = this.requireVault(owner);
    const withdrawn = record.state.fiatBalance;
    record.state.fiatBalance = 0n;
    record.state.agentStatus = "PAUSED";
    const activity = this.appendActivity(record, "EmergencyFiatWithdrawn", {
      fiatWithdrawn: withdrawn.toString(),
    });
    this.commit(owner, record, activity);
    return record.state;
  }

  subscribe(callback: VaultSubscriber): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** LiveStrategyEngine 등 실시세 소스가 준비되면 crypto 가격 콜백을 주입한다. */
  setPriceSource(source: (() => number) | null): void {
    this.priceSource = source;
  }

  private resolveCryptoPrice(): number {
    if (this.priceSource) {
      try {
        const price = this.priceSource();
        if (Number.isFinite(price) && price > 0) return price;
      } catch {
        // 시세 콜백이 실패하면 고정 폴백 환율을 사용한다.
      }
    }
    return FALLBACK_CRYPTO_PRICE_USDC;
  }

  /**
   * LiveStrategyEngine 연결 지점. import로 타입을 고정하지 않고 duck typing으로만 다룬다.
   *  - engine.getLatestPrice(symbol)이 있으면 긴급청산 환산 시세로 사용한다.
   *  - engine.subscribe(cb)가 있으면 시그널 이벤트를 활동 피드로 변환해 흘려보낸다.
   */
  attachEngine(engine: unknown, options?: { owner?: string | null }): void {
    this.detachEngine();

    if (!engine || typeof engine !== "object") return;
    const candidate = engine as EngineLike;

    if (typeof candidate.getLatestPrice === "function") {
      const getLatestPrice = candidate.getLatestPrice.bind(candidate);
      this.setPriceSource(
        () => getLatestPrice("SUIUSDT") ?? FALLBACK_CRYPTO_PRICE_USDC
      );
    } else if (typeof candidate.getSnapshot === "function") {
      // LiveStrategyEngine은 getLatestPrice 대신 getSnapshot().prices를 노출한다.
      // 긴급청산의 minFiatOutput(라이브 시세 기반)과 환산 시세가 어긋나지 않도록 여기서 연결.
      const getSnapshot = candidate.getSnapshot.bind(candidate);
      this.setPriceSource(() => {
        const price = getSnapshot()?.prices?.SUIUSDT;
        return typeof price === "number" && price > 0
          ? price
          : FALLBACK_CRYPTO_PRICE_USDC;
      });
    }

    if (typeof candidate.subscribe === "function") {
      const owner = options?.owner ?? null;
      const unsubscribe = candidate.subscribe((tick) =>
        this.handleEngineTick(tick, owner)
      );
      this.engineUnsubscribe =
        typeof unsubscribe === "function" ? unsubscribe : null;
    }
  }

  detachEngine(): void {
    this.engineUnsubscribe?.();
    this.engineUnsubscribe = null;
  }

  /**
   * 엔진 subscribe 콜백은 매 가격 틱마다 EngineTick을 전달한다.
   * 실제 시그널 파이프라인 이벤트는 tick.events 배열 안에 있으므로 개별로 변환한다.
   * events가 비어 있는 틱(시그널 없는 가격 갱신)은 피드에 아무것도 남기지 않는다.
   */
  private handleEngineTick(tick: EngineTickLike, owner: string | null): void {
    if (!tick || !Array.isArray(tick.events) || tick.events.length === 0) return;
    const record = owner ? this.data.vaults[owner] : this.data.guest;
    if (!record) return;

    // 구독자(useVault)는 VaultDataEvent.activity 단위로 피드를 쌓으므로
    // 한 틱에 여러 이벤트가 와도 각각 commit해서 하나도 유실되지 않게 한다.
    for (const event of tick.events) {
      if (!event || typeof event !== "object") continue;
      const type = ENGINE_EVENT_TYPE_MAP[event.type ?? ""];
      if (!type) continue;

      const activity = this.appendActivity(record, type, {
        agentId: event.agentId,
        signalId: event.signalId,
        side: event.side,
        symbol: event.symbol,
        // ORDER_EXECUTED는 fillPrice/quantity, 나머지는 price를 쓴다.
        price: event.price ?? event.fillPrice,
        quantity: event.quantity,
        riskScoreBps: event.riskScoreBps,
        reason: event.reason,
      });
      this.commit(owner, record, activity);
    }
  }
}

/** LiveStrategyEngine ActivityEventType → 볼트 활동 피드 타입 매핑. */
const ENGINE_EVENT_TYPE_MAP: Record<string, VaultActivityEventType | undefined> = {
  SIGNAL_RECEIVED: "SignalReceived",
  SIGNAL_VERIFIED: "SignalVerified",
  SIGNAL_REJECTED: "SignalRejected",
  ORDER_EXECUTED: "OrderExecuted",
};
