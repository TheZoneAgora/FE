// 볼트 데이터 레이어 도메인 타입.
// 컨트랙트 스키마와 온보딩 기본값은 .omc/specs/deep-interview-agora-vault-userside.md
// Technical Context 절을 따른다.

/** AgoraAgent(자동매매 에이전트)의 현재 상태. */
export type AgentStatus = "ACTIVE" | "REDUCE_ONLY" | "PAUSED";

/**
 * Vault 리스크 한도 12개 필드 (스펙 "온보딩 기본 정책값" 표 기준).
 * fiat류 금액은 USDC 6 decimals 최소단위(bigint), crypto류는 SUI 9 decimals(MIST, bigint).
 * bps(basis points)/ms 필드는 안전한 정수 범위라 number로 둔다.
 */
export interface RiskPolicy {
  /** 1회 거래 요청 한도 (fiat, 최소단위) */
  maxTradeAmount: bigint;
  /** epoch 누적 거래 요청 한도 (fiat, 최소단위) */
  maxEpochTradeAmount: bigint;
  /** 1회 crypto 매도 요청 한도 (crypto, 최소단위) */
  maxCryptoSellAmount: bigint;
  /** epoch 누적 crypto 매도 한도 (crypto, 최소단위) */
  maxEpochCryptoSellAmount: bigint;
  /** 일일 fiat 거래대금 한도 (fiat, 최소단위) */
  maxDailyFiatVolume: bigint;
  /** 누적 손실 한도 — 초과 시 Kill Switch (fiat, 최소단위) */
  maxLossAmount: bigint;
  /** BUY 신호 위험도 상한 (bps, 0~10000) */
  maxRiskScoreBps: number;
  /** Kill Switch 판단 윈도우 길이 (ms) */
  lossWindowMs: number;
  /** 윈도우 내 손실 한도 — 초과 시 Kill Switch (fiat, 최소단위) */
  maxWindowLossAmount: bigint;
  /** 신호 가격과 실제 체결가 최대 허용 편차 (bps) */
  maxPriceDeviationBps: number;
  /** 신호 발생 후 허용되는 최대 지연 시간 (ms) */
  maxSignalDelayMs: number;
  /** 최대 포지션 크기 — configure_execution_policy 전용 한도 (fiat, 최소단위) */
  maxPositionSize: bigint;
}

/**
 * configure_execution_policy 트랜잭션에는 RiskPolicy 12필드 외에
 * DEX pool 주소와 거래 허용 시간대도 함께 필요하다.
 * 온보딩 기본값 표에는 없는 값이라 RiskPolicy와 분리해 선택 필드로 둔다.
 */
export interface ExecutionPolicyUpdate extends Partial<RiskPolicy> {
  allowedPool?: string;
  tradingStartMinuteUtc?: number;
  tradingEndMinuteUtc?: number;
}

/** 온보딩 시 자동 적용되는 기본 정책값 (스펙 표, USDC 6 decimals 기준). */
export const DEFAULT_RISK_POLICY: RiskPolicy = {
  maxTradeAmount: 100_000_000n,
  maxEpochTradeAmount: 500_000_000n,
  maxCryptoSellAmount: 100_000_000n,
  maxEpochCryptoSellAmount: 500_000_000n,
  maxDailyFiatVolume: 500_000_000n,
  maxLossAmount: 100_000_000n,
  maxRiskScoreBps: 7000,
  lossWindowMs: 60 * 60 * 1000,
  maxWindowLossAmount: 50_000_000n,
  maxPriceDeviationBps: 500,
  maxSignalDelayMs: 300_000,
  // 스펙 표에 없는 필드. epoch 거래 한도와 동일하게 잡아 최소 제약으로 시작한다.
  maxPositionSize: 500_000_000n,
};

/**
 * 거래 허용 시간대 기본값 (0/0 = 시간 제약 없음).
 * RiskPolicy/VaultState에는 보관되지 않아 설정 폼의 baseline으로 쓴다.
 */
export const DEFAULT_EXECUTION_POLICY_EXTRAS = {
  tradingStartMinuteUtc: 0,
  tradingEndMinuteUtc: 0,
};

export interface VaultState {
  /** 게스트 데모 볼트나 아직 온체인에 생성되지 않은 mock 볼트는 null. */
  vaultId: string | null;
  /** 게스트 데모 볼트는 owner가 없다. */
  owner: string | null;
  /** fiat(USDC) 잔액, 6 decimals 최소단위 */
  fiatBalance: bigint;
  /** crypto(SUI) 잔액, 9 decimals 최소단위(MIST) */
  cryptoBalance: bigint;
  agentStatus: AgentStatus;
  policy: RiskPolicy;
  /** 누적 실현 손실 (fiat, 최소단위) */
  realizedLoss: bigint;
  /** 현재 윈도우 손실 (fiat, 최소단위) */
  windowLoss: bigint;
  /** 당일 누적 거래대금 (fiat, 최소단위) */
  dailyVolume: bigint;
  /** 지갑 미연결 방문자에게 보여주는 사전 시드 데모 볼트인지 여부 */
  isGuest: boolean;
}

/**
 * 온체인 이벤트 5종 + LiveStrategyEngine 시그널 파이프라인 3종 + owner가 직접 트리거하는
 * Vault 뮤테이션 6종(입금/출금/정지/재개/reduce-only/정책변경)을 하나의 활동 피드로 매핑.
 * 뒤 6종은 온체인 이벤트는 아니지만, "모든 뮤테이션이 활동 이벤트를 발행한다"는 요구사항 때문에 추가했다.
 */
export type VaultActivityEventType =
  | "OrderExecuted"
  | "DeepBookOrderExecuted"
  | "KillSwitchTriggered"
  | "EmergencyLiquidated"
  | "EmergencyFiatWithdrawn"
  | "SignalReceived"
  | "SignalVerified"
  | "SignalRejected"
  | "DepositReceived"
  | "WithdrawalExecuted"
  | "AgentRevoked"
  | "AgentReactivated"
  | "ReduceOnlyUpdated"
  | "PolicyUpdated";

export interface VaultActivityEvent {
  id: string;
  type: VaultActivityEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}
