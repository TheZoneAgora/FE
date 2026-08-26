import type {
  ExecutionPolicyUpdate,
  VaultActivityEvent,
  VaultState,
} from "@/lib/vault/types";

export interface CreateVaultParams {
  /** 최초 입금액 (fiat, USDC 6 decimals 최소단위) */
  depositAmount: bigint;
}

export interface EmergencyLiquidateAllParams {
  /** 현재 시세 × (1 - 슬리피지 허용)으로 계산된 최소 수령 fiat 금액. 0 금지. */
  minFiatOutput: bigint;
  /** real 모드 전용: DeepBook pool object ID. mock에서는 무시된다. */
  poolId?: string;
  /** real 모드 전용: AgoraAgent 운영 지갑이 제공하는 Coin<DEEP> 수수료 오브젝트 ID. mock에서는 무시된다. */
  deepFeeCoinId?: string;
  /** real 모드 전용: 트랜잭션 유효 마감 시각(ms). 생략 시 now + 60s. mock에서는 무시된다. */
  deadlineMs?: number;
}

/** subscribe 콜백에 전달되는 알림. activity는 상태 변화 없이 이벤트만 추가될 때도 온다. */
export interface VaultDataEvent {
  owner: string | null;
  state: VaultState;
  activity?: VaultActivityEvent;
}

export type VaultSubscriber = (event: VaultDataEvent) => void;

/**
 * Vault 데이터 레이어의 스왑 가능한 인터페이스.
 * mock 구현(MockVaultSource)과 real 구현(SuiVaultSource)이 동일한 계약을 따른다.
 * lib/data/AgentDataSource.ts 패턴을 그대로 계승.
 */
export interface VaultDataSource {
  hasVault(owner: string): Promise<boolean>;
  getVaultState(owner: string): Promise<VaultState>;

  createVault(owner: string, params: CreateVaultParams): Promise<VaultState>;
  depositMore(owner: string, amount: bigint): Promise<VaultState>;
  withdrawAmount(owner: string, amount: bigint): Promise<VaultState>;
  /** crypto 잔액만 일부 출금한다. Agent를 멈춘 뒤 포지션을 코인째 빼올 때 쓴다.
   *  withdrawAll은 fiat·crypto를 한꺼번에 비우므로 부분 회수는 이 경로가 필요하다. */
  withdrawCrypto(owner: string, amount: bigint): Promise<VaultState>;
  withdrawAll(owner: string): Promise<VaultState>;

  revokeAgent(owner: string): Promise<VaultState>;
  reactivateAgent(owner: string): Promise<VaultState>;
  setReduceOnly(owner: string, reduceOnly: boolean): Promise<VaultState>;
  configurePolicy(
    owner: string,
    policy: ExecutionPolicyUpdate
  ): Promise<VaultState>;

  emergencyLiquidateAll(
    owner: string,
    params: EmergencyLiquidateAllParams
  ): Promise<VaultState>;
  emergencyPauseAndWithdraw(owner: string): Promise<VaultState>;

  /** 지갑 미연결 방문자용 사전 시드 데모 볼트. real 구현에는 게스트 개념이 없어 선택 필드. */
  getGuestVault?(): Promise<VaultState>;

  /** 저장된 활동 이력(최신순). 피드 초기 로드용 — mock 전용 선택 필드. */
  getActivityHistory?(owner: string | null): Promise<VaultActivityEvent[]>;

  /** 상태/활동 이벤트 변경을 구독한다. 반환값은 구독 해제 함수. */
  subscribe(callback: VaultSubscriber): () => void;
}
