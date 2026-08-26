// Sui Programmable Transaction Block(PTB) 빌더.
// .omc/artifacts/Vault_Dex.reference.js (컨트랙트 팀 원본, JS)을 TS로 포팅.
// 이 US-003 범위에서 필요한 owner/긴급탈출 계열 함수만 포팅한다
// (BUY/SELL 원자적 주문 실행 계열은 range 밖 — order_executor/deepbook_executor의
// 일반 execute_buy/execute_sell, replace_agent, update_*_limit 등은 포함하지 않음).
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress, normalizeSuiAddress } from "@mysten/sui/utils";

import {
  AGENT_MARKET_PACKAGE_ID,
  AGORA_AGENT_OPERATOR,
  AGORA_CRYPTO_COIN_TYPE,
  AGORA_FIAT_COIN_TYPE,
} from "@/lib/config/env";

// Move module: agent_market::investment_vault
const VAULT_MODULE = "investment_vault";
// DeepBook v3 실거래 긴급탈출 경로 (emergency_liquidate_all).
const DEEPBOOK_EXECUTOR_MODULE = "deepbook_executor";
const CLOCK_OBJECT_ID = "0x6";

// Move의 u64가 표현할 수 있는 최댓값: 2^64 - 1
const MAX_U64 = (1n << 64n) - 1n;

export type U64Input = bigint | number | string;

// Sui 주소 또는 object ID를 검증하고 정규화한다.
function requireAddress(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  const normalized = normalizeSuiAddress(value);

  if (!isValidSuiAddress(normalized)) {
    throw new Error(`${label} must be a valid Sui address.`);
  }

  return normalized;
}

// package ID가 함수 인자로 없으면 환경변수(env.ts) 기본값을 사용한다.
function requirePackageId(packageId: string | undefined): string {
  if (!packageId) {
    throw new Error("NEXT_PUBLIC_AGENT_MARKET_PACKAGE_ID is required.");
  }

  return requireAddress(packageId, "packageId");
}

// Move의 T type argument로 사용할 전체 타입인지 확인한다.
function requireCoinType(coinType: string | undefined): string {
  if (typeof coinType !== "string" || !coinType.includes("::")) {
    throw new Error("coinType must be a fully qualified Move type.");
  }

  return coinType;
}

// Move u64에 전달할 값인지 확인하고 bigint로 변환한다.
function requireU64(value: U64Input, label: string): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error(
      `${label} must be a safe integer, bigint, or integer string.`
    );
  }

  let result: bigint;

  try {
    result = BigInt(value);
  } catch {
    throw new Error(`${label} must be an integer.`);
  }

  if (result < 0n || result > MAX_U64) {
    throw new Error(`${label} must fit in u64.`);
  }

  return result;
}

// 입금·출금·거래 요청처럼 양수가 필요한 값인지 확인한다.
function requirePositiveU64(value: U64Input, label: string): bigint {
  const result = requireU64(value, label);

  if (result === 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return result;
}

// 위험도와 상한은 bps 단위이므로 0~10000 범위를 벗어나면 온체인에서 abort한다.
function requireBps(value: U64Input, label: string): bigint {
  const result = requireU64(value, label);

  if (result > 10_000n) {
    throw new Error(`${label} must be between 0 and 10000 bps.`);
  }

  return result;
}

// 이미 만들어 둔 Transaction에 Vault moveCall을 하나 덧붙인다.
// 한 트랜잭션에 여러 호출을 묶어야 할 때(정책 저장 + 한도 변경) 쓴다.
function addVaultMoveCall(
  transaction: Transaction,
  {
    packageId,
    functionName,
    buildArguments,
  }: {
    packageId: string | undefined;
    functionName: string;
    buildArguments: (transaction: Transaction) => unknown[];
  }
): Transaction {
  transaction.moveCall({
    package: requirePackageId(packageId),
    module: VAULT_MODULE,
    function: functionName,
    // Move 제네릭 순서에 맞춰 FiatT와 CryptoT를 전달한다.
    typeArguments: [
      requireCoinType(AGORA_FIAT_COIN_TYPE),
      requireCoinType(AGORA_CRYPTO_COIN_TYPE),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments: buildArguments(transaction) as any,
  });

  return transaction;
}

// 모든 Vault moveCall에서 공통으로 사용하는 Transaction 생성 함수.
// 네트워크에 전송하지 않고 서명 전 Transaction만 반환한다.
function buildVaultMoveCall(params: {
  packageId: string | undefined;
  functionName: string;
  buildArguments: (transaction: Transaction) => unknown[];
}): Transaction {
  return addVaultMoveCall(new Transaction(), params);
}

export interface BuildCreateVaultTransactionParams {
  packageId?: string;
  depositAmount: U64Input;
  maxTradeAmount: U64Input;
  maxEpochTradeAmount: U64Input;
  maxCryptoSellAmount: U64Input;
  maxEpochCryptoSellAmount: U64Input;
}

// 사용자 USDC 입금과 Agora 기본 설정으로 UserVault<FiatT, CryptoT>를 만든다.
// CryptoT 잔액은 0으로 시작하며 향후 성공한 BUY 결과로만 증가해야 한다.
export function buildCreateVaultTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  depositAmount,
  maxTradeAmount,
  maxEpochTradeAmount,
  maxCryptoSellAmount,
  maxEpochCryptoSellAmount,
}: BuildCreateVaultTransactionParams): Transaction {
  const deposit = requirePositiveU64(depositAmount, "depositAmount");
  const tradeLimit = requirePositiveU64(maxTradeAmount, "maxTradeAmount");
  const epochLimit = requirePositiveU64(
    maxEpochTradeAmount,
    "maxEpochTradeAmount"
  );
  const cryptoSellLimit = requirePositiveU64(
    maxCryptoSellAmount,
    "maxCryptoSellAmount"
  );
  const epochCryptoSellLimit = requirePositiveU64(
    maxEpochCryptoSellAmount,
    "maxEpochCryptoSellAmount"
  );

  // 1회 한도가 전체 epoch 한도보다 크면 설정 자체가 모순이므로 미리 차단한다.
  // Move의 create_vault도 같은 조건을 다시 검사해 최종 보안을 담당한다.
  if (tradeLimit > epochLimit) {
    throw new Error("maxTradeAmount cannot exceed maxEpochTradeAmount.");
  }

  if (cryptoSellLimit > epochCryptoSellLimit) {
    throw new Error(
      "maxCryptoSellAmount cannot exceed maxEpochCryptoSellAmount."
    );
  }

  return buildVaultMoveCall({
    packageId,
    functionName: "create_vault",
    buildArguments: (transaction) => {
      const depositCoin = transaction.coin({
        type: AGORA_FIAT_COIN_TYPE,
        balance: deposit,
      });

      return [
        depositCoin,
        transaction.pure.address(
          requireAddress(
            AGORA_AGENT_OPERATOR,
            "NEXT_PUBLIC_AGORA_AGENT_OPERATOR"
          )
        ),
        transaction.pure.u64(tradeLimit),
        transaction.pure.u64(epochLimit),
        transaction.pure.u64(cryptoSellLimit),
        transaction.pure.u64(epochCryptoSellLimit),
      ];
    },
  });
}

export interface BuildDepositMoreTransactionParams {
  packageId?: string;
  vaultId: string;
  amount: U64Input;
}

// owner가 기존 Vault에 같은 타입의 Coin<T>를 추가 입금한다.
// Move: deposit_more<T>(vault, deposit, ctx)
export function buildDepositMoreTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  amount,
}: BuildDepositMoreTransactionParams): Transaction {
  const depositAmount = requirePositiveU64(amount, "amount");

  return buildVaultMoveCall({
    packageId,
    functionName: "deposit_more",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.coin({
        type: AGORA_FIAT_COIN_TYPE,
        balance: depositAmount,
      }),
    ],
  });
}

export interface BuildWithdrawAllTransactionParams {
  packageId?: string;
  vaultId: string;
}

// owner가 Vault의 전체 잔액을 출금한다.
// Move: withdraw_all_assets<T>(vault, ctx)
export function buildWithdrawAllTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
}: BuildWithdrawAllTransactionParams): Transaction {
  return buildVaultMoveCall({
    packageId,
    functionName: "withdraw_all_assets",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
    ],
  });
}

export interface BuildWithdrawAmountTransactionParams {
  packageId?: string;
  vaultId: string;
  amount: U64Input;
}

// owner가 amount만큼 일부 fiat 잔액을 출금한다.
// Move: withdraw_amount<T>(vault, amount, ctx)
export function buildWithdrawAmountTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  amount,
}: BuildWithdrawAmountTransactionParams): Transaction {
  const withdrawAmount = requirePositiveU64(amount, "amount");

  return buildVaultMoveCall({
    packageId,
    functionName: "withdraw_amount",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.pure.u64(withdrawAmount),
    ],
  });
}

export interface BuildWithdrawCryptoAmountTransactionParams {
  packageId?: string;
  vaultId: string;
  amount: U64Input;
}

// owner가 Vault의 crypto_balance에서 일부 금액을 출금한다.
// Move: withdraw_crypto_amount<FiatT, CryptoT>(vault, amount, ctx)
export function buildWithdrawCryptoAmountTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  amount,
}: BuildWithdrawCryptoAmountTransactionParams): Transaction {
  const withdrawAmount = requirePositiveU64(amount, "amount");

  return buildVaultMoveCall({
    packageId,
    functionName: "withdraw_crypto_amount",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.pure.u64(withdrawAmount),
    ],
  });
}

export interface BuildRevokeAgentTransactionParams {
  packageId?: string;
  vaultId: string;
}

// owner가 AgoraAgent의 거래 권한을 중지한다 (AgentStatus → PAUSED).
// Move: revoke_agent<T>(vault, ctx)
export function buildRevokeAgentTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
}: BuildRevokeAgentTransactionParams): Transaction {
  return buildVaultMoveCall({
    packageId,
    functionName: "revoke_agent",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
    ],
  });
}

export interface BuildReactivateAgentTransactionParams {
  packageId?: string;
  vaultId: string;
}

// owner가 현재 등록된 AgoraAgent를 다시 활성화한다.
// Move: reactivate_agent<T>(vault, ctx)
export function buildReactivateAgentTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
}: BuildReactivateAgentTransactionParams): Transaction {
  return buildVaultMoveCall({
    packageId,
    functionName: "reactivate_agent",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
    ],
  });
}

export interface BuildSetReduceOnlyTransactionParams {
  packageId?: string;
  vaultId: string;
  reduceOnly: boolean;
}

// owner가 AgoraAgent를 reduce-only(신규 진입 금지, 청산성 SELL만 허용) 모드로 전환하거나 해제한다.
// Move: set_reduce_only<T>(vault, reduce_only, ctx)
// 참고: Vault_Dex.reference.js에는 없고 스펙 Technical Context의 Owner 함수 목록에만
// 있는 함수라, revoke_agent/reactivate_agent와 같은 단일-vault 뮤테이션 패턴으로 포팅했다.
export function buildSetReduceOnlyTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  reduceOnly,
}: BuildSetReduceOnlyTransactionParams): Transaction {
  return buildVaultMoveCall({
    packageId,
    functionName: "set_reduce_only",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.pure.bool(reduceOnly),
    ],
  });
}

export interface BuildConfigureExecutionPolicyTransactionParams {
  packageId?: string;
  vaultId: string;
  allowedPool: string;
  maxDailyFiatVolume: U64Input;
  maxPositionSize: U64Input;
  maxLossAmount: U64Input;
  tradingStartMinuteUtc?: U64Input;
  tradingEndMinuteUtc?: U64Input;
  maxSignalDelayMs: U64Input;
  maxPriceDeviationBps: U64Input;
  maxRiskScoreBps: U64Input;
  lossWindowMs: U64Input;
  maxWindowLossAmount: U64Input;
  /** 함께 바꿀 거래 한도. configure_execution_policy가 받지 않는 값들이라
   *  별도 호출로 같은 트랜잭션에 덧붙인다. 생략하면 한도는 건드리지 않는다. */
  limits?: VaultTradeLimits;
  /** limits를 올리는 방향이면 true. addTradeLimitCalls 주석 참고. */
  raisingLimits?: boolean;
}

// Owner가 원자적 주문 실행에 적용할 Vault 안전 정책을 설정한다.
export function buildConfigureExecutionPolicyTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  allowedPool,
  maxDailyFiatVolume,
  maxPositionSize,
  maxLossAmount,
  tradingStartMinuteUtc = 0,
  tradingEndMinuteUtc = 0,
  maxSignalDelayMs,
  maxPriceDeviationBps,
  maxRiskScoreBps,
  lossWindowMs,
  maxWindowLossAmount,
  limits,
  raisingLimits = true,
}: BuildConfigureExecutionPolicyTransactionParams): Transaction {
  const transaction = buildVaultMoveCall({
    packageId,
    functionName: "configure_execution_policy",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.pure.address(requireAddress(allowedPool, "allowedPool")),
      transaction.pure.u64(
        requirePositiveU64(maxDailyFiatVolume, "maxDailyFiatVolume")
      ),
      transaction.pure.u64(
        requirePositiveU64(maxPositionSize, "maxPositionSize")
      ),
      transaction.pure.u64(requireU64(maxLossAmount, "maxLossAmount")),
      transaction.pure.u64(
        requireU64(tradingStartMinuteUtc, "tradingStartMinuteUtc")
      ),
      transaction.pure.u64(
        requireU64(tradingEndMinuteUtc, "tradingEndMinuteUtc")
      ),
      transaction.pure.u64(
        requirePositiveU64(maxSignalDelayMs, "maxSignalDelayMs")
      ),
      transaction.pure.u64(
        requireU64(maxPriceDeviationBps, "maxPriceDeviationBps")
      ),
      transaction.pure.u64(requireBps(maxRiskScoreBps, "maxRiskScoreBps")),
      transaction.pure.u64(requirePositiveU64(lossWindowMs, "lossWindowMs")),
      transaction.pure.u64(
        requireU64(maxWindowLossAmount, "maxWindowLossAmount")
      ),
    ],
  });

  // 한도는 configure_execution_policy가 받지 않으므로 같은 트랜잭션에 덧붙인다.
  // 나눠 보내면 정책만 반영되고 한도는 실패하는 중간 상태가 생길 수 있다.
  if (limits) {
    addTradeLimitCalls(
      transaction,
      packageId,
      vaultId,
      limits,
      raisingLimits
    );
  }

  return transaction;
}

/** Owner가 조정할 수 있는 4종 한도. configure_execution_policy에는 들어 있지 않고
 *  각각 별도 함수로 분리돼 있다. 바꿀 것만 넣으면 된다. */
export interface VaultTradeLimits {
  maxTradeAmount?: U64Input;
  maxEpochTradeAmount?: U64Input;
  maxCryptoSellAmount?: U64Input;
  maxEpochCryptoSellAmount?: U64Input;
}

const TRADE_LIMIT_FUNCTIONS: Array<{
  key: keyof VaultTradeLimits;
  functionName: string;
}> = [
  { key: "maxTradeAmount", functionName: "update_trade_limit" },
  { key: "maxEpochTradeAmount", functionName: "update_epoch_trade_limit" },
  { key: "maxCryptoSellAmount", functionName: "update_crypto_sell_limit" },
  {
    key: "maxEpochCryptoSellAmount",
    functionName: "update_epoch_crypto_sell_limit",
  },
];

/** 한도 변경 호출들을 기존 Transaction에 덧붙인다. 값이 없는 항목은 건너뛴다.
 *
 *  순서가 중요하다. 온체인 검사가 "1회 한도 <= epoch 한도"를 요구하므로, 한도를
 *  올릴 때는 epoch를 먼저 올려야 중간 상태에서 abort하지 않는다. 반대로 내릴 때는
 *  1회를 먼저 내려야 한다. 그래서 새 값과 현재 값을 비교해 방향을 정한다. */
function addTradeLimitCalls(
  transaction: Transaction,
  packageId: string | undefined,
  vaultId: string,
  limits: VaultTradeLimits,
  raising: boolean
): Transaction {
  const ordered = raising
    ? [...TRADE_LIMIT_FUNCTIONS].reverse()
    : TRADE_LIMIT_FUNCTIONS;

  for (const { key, functionName } of ordered) {
    const value = limits[key];
    if (value === undefined) continue;

    addVaultMoveCall(transaction, {
      packageId,
      functionName,
      buildArguments: (tx) => [
        tx.object(requireAddress(vaultId, "vaultId")),
        tx.pure.u64(requirePositiveU64(value, key)),
      ],
    });
  }

  return transaction;
}

export interface BuildUpdateTradeLimitsTransactionParams {
  packageId?: string;
  vaultId: string;
  limits: VaultTradeLimits;
  /** epoch 한도를 먼저 올려야 하는 경우 true. 자세한 이유는 addTradeLimitCalls 주석 참고. */
  raising?: boolean;
}

/** 한도만 바꾼다. 정책까지 함께 저장할 때는
 *  buildConfigureExecutionPolicyTransaction에 limits를 넘겨 한 트랜잭션으로 묶는다. */
export function buildUpdateTradeLimitsTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  limits,
  raising = true,
}: BuildUpdateTradeLimitsTransactionParams): Transaction {
  return addTradeLimitCalls(
    new Transaction(),
    packageId,
    vaultId,
    limits,
    raising
  );
}

export interface BuildEmergencyPauseAndWithdrawFiatTransactionParams {
  packageId?: string;
  vaultId: string;
}

// 긴급 탈출 1: AgoraAgent를 정지시키고 Vault의 USDC 전액을 Owner 지갑으로 회수한다.
// 정지와 회수를 한 트랜잭션으로 묶는다. crypto 포지션은 남는다.
// Move: emergency_pause_and_withdraw_fiat<T>(vault, ctx)
export function buildEmergencyPauseAndWithdrawFiatTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
}: BuildEmergencyPauseAndWithdrawFiatTransactionParams): Transaction {
  return buildVaultMoveCall({
    packageId,
    functionName: "emergency_pause_and_withdraw_fiat",
    buildArguments: (transaction) => [
      transaction.object(requireAddress(vaultId, "vaultId")),
    ],
  });
}

export interface BuildDeepBookEmergencyLiquidateAllTransactionParams {
  packageId?: string;
  vaultId: string;
  poolId: string;
  deepFeeCoinId: string;
  minFiatOutput: U64Input;
  deadlineMs: U64Input;
}

// 긴급 탈출 2: 보유 CryptoT를 DeepBook 시장가로 전량 매도해 USDC로 바꾸고 Vault를 정지한다.
// Owner만 호출할 수 있고 PAUSED 상태에서도 동작한다. 거래 한도·시간대·가격 편차 검사는 적용되지 않는다.
// minFiatOutput은 반드시 실제 시세를 반영해야 한다. 0으로 두면 샌드위치 공격에 노출된다.
export function buildDeepBookEmergencyLiquidateAllTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  vaultId,
  poolId,
  deepFeeCoinId,
  minFiatOutput,
  deadlineMs,
}: BuildDeepBookEmergencyLiquidateAllTransactionParams): Transaction {
  const transaction = new Transaction();
  transaction.moveCall({
    package: requirePackageId(packageId),
    module: DEEPBOOK_EXECUTOR_MODULE,
    function: "emergency_liquidate_all",
    typeArguments: [
      requireCoinType(AGORA_FIAT_COIN_TYPE),
      requireCoinType(AGORA_CRYPTO_COIN_TYPE),
    ],
    arguments: [
      transaction.object(requireAddress(vaultId, "vaultId")),
      transaction.object(requireAddress(poolId, "poolId")),
      transaction.object(requireAddress(deepFeeCoinId, "deepFeeCoinId")),
      transaction.pure.u64(requireU64(minFiatOutput, "minFiatOutput")),
      transaction.pure.u64(requireU64(deadlineMs, "deadlineMs")),
      transaction.object(CLOCK_OBJECT_ID),
    ],
  });
  return transaction;
}
