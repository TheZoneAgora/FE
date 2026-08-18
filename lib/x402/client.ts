// x402 시그널 결제 클라이언트.
// contract 레포 sui-contract/sources/Dex/x402_client.js를 TS로 포팅.
// 흐름: Provider API 호출 → 402 challenge 수신 → payment_splitter로 온체인 결제
// → PAYMENT-SIGNATURE 헤더(트랜잭션 digest)를 실어 재요청 → 시그널 수신.
//
// 원본에서 결제 주체는 사용자 지갑이 아니라 AgoraAgent 운영 signer다.
// FE에서는 signer를 주입받는 형태만 유지하고, 운영 signer가 없는 mock 모드에서는
// executeSignalProviderWithX402Mock으로 같은 흐름을 시뮬레이션한다.
import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";

import { AGENT_MARKET_PACKAGE_ID } from "@/lib/config/env";

const PAYMENT_HEADER = "PAYMENT-SIGNATURE";
const PAYMENT_SPLITTER_MODULE = "payment_splitter";
const CLOCK_OBJECT_ID = "0x6";
const MAX_U64 = (1n << 64n) - 1n;

/** Provider가 HTTP 402 응답 본문으로 내려주는 결제 조건. */
export interface X402Challenge {
  error: "Payment Required";
  /** 결제 금액 (코인 최소단위, 문자열 u64) */
  price: string;
  /** 결제 코인 타입 (예: 0x...::usdc::USDC) */
  token: string;
  /** Signal Provider 수령 주소 */
  payee: string;
  /** 플랫폼 트레저리 주소 */
  treasury: string;
  /** 내부 Signal Provider 식별자 */
  signalProviderId: string;
  /** 플랫폼 수수료 (bps, 문자열) */
  platformFeeBps: string;
}

export interface X402Signer {
  signAndExecuteTransaction: (input: {
    transaction: Transaction;
  }) => Promise<unknown>;
}

function requireAddressLike(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error(`${label} must be a Sui address string.`);
  }
  return value;
}

function requireU64(value: unknown, label: string, allowZero = false): bigint {
  let parsed: bigint;
  try {
    parsed = BigInt(value as string);
  } catch {
    throw new Error(`${label} must contain an integer.`);
  }
  if (parsed < 0n || parsed > MAX_U64) {
    throw new Error(`${label} must fit in Move u64.`);
  }
  if (!allowZero && parsed === 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return parsed;
}

export function parseChallenge(value: unknown): X402Challenge {
  if (typeof value !== "object" || value === null) {
    throw new Error("Signal Provider가 잘못된 x402 응답을 반환했습니다.");
  }
  const body = value as Record<string, unknown>;
  if (
    body.error !== "Payment Required" ||
    typeof body.price !== "string" ||
    typeof body.payee !== "string" ||
    typeof body.treasury !== "string" ||
    typeof body.token !== "string" ||
    typeof body.signalProviderId !== "string" ||
    typeof body.platformFeeBps !== "string"
  ) {
    throw new Error("Signal Provider의 x402 challenge가 불완전합니다.");
  }
  return body as unknown as X402Challenge;
}

/** challenge 조건대로 payment_splitter::pay_signal_provider_usage_fee PTB를 만든다. */
export function buildSignalProviderUsagePaymentTransaction({
  packageId = AGENT_MARKET_PACKAGE_ID,
  challenge,
}: {
  packageId?: string;
  challenge: X402Challenge;
}): Transaction {
  const price = requireU64(challenge.price, "price");
  const platformFeeBps = requireU64(challenge.platformFeeBps, "platformFeeBps", true);
  if (platformFeeBps > 10_000n) {
    throw new Error("platformFeeBps cannot exceed 10000.");
  }

  let token: string;
  try {
    token = normalizeStructTag(challenge.token);
  } catch {
    throw new Error("token must be a fully qualified Move coin type.");
  }

  const transaction = new Transaction();
  const [payment] = transaction.splitCoins(transaction.gas, [price]);

  transaction.moveCall({
    target: `${packageId}::${PAYMENT_SPLITTER_MODULE}::pay_signal_provider_usage_fee`,
    typeArguments: [token],
    arguments: [
      payment,
      transaction.pure.address(
        requireAddressLike(challenge.signalProviderId, "signalProviderId")
      ),
      transaction.pure.address(requireAddressLike(challenge.payee, "payee")),
      transaction.pure.address(requireAddressLike(challenge.treasury, "treasury")),
      transaction.pure.u64(platformFeeBps),
      transaction.object(CLOCK_OBJECT_ID),
    ],
  });

  return transaction;
}

function getExecutionDigest(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    throw new Error("지갑이 잘못된 실행 결과를 반환했습니다.");
  }
  const value = result as {
    FailedTransaction?: { status?: { error?: { message?: string } | string } };
    digest?: unknown;
    Transaction?: { digest?: unknown };
  };
  if (value.FailedTransaction) {
    const err = value.FailedTransaction.status?.error;
    const reason =
      (typeof err === "object" ? err?.message : err) ??
      "Unknown Sui execution failure";
    throw new Error(`x402 결제 트랜잭션 실패: ${reason}`);
  }
  const digest = value.digest ?? value.Transaction?.digest;
  if (typeof digest !== "string" || digest.length === 0) {
    throw new Error("실행 결과에 트랜잭션 digest가 없습니다.");
  }
  return digest;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

/**
 * Signal Provider API를 x402로 호출한다 (real 모드 — signer 필요).
 * 402가 아니면 그대로 반환, 402면 결제 후 PAYMENT-SIGNATURE 헤더로 재요청.
 */
export async function executeSignalProviderWithX402({
  signalProviderApiUrl,
  vaultId,
  amount,
  packageId = AGENT_MARKET_PACKAGE_ID,
  signer,
  fetchImpl = fetch,
}: {
  signalProviderApiUrl: string;
  vaultId: string;
  amount: bigint | number | string;
  packageId?: string;
  signer: X402Signer;
  fetchImpl?: typeof fetch;
}): Promise<unknown> {
  const requestBody = JSON.stringify({
    vaultId,
    amount: requireU64(amount, "amount").toString(),
  });

  const initialResponse = await fetchImpl(signalProviderApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });

  if (initialResponse.status !== 402) {
    const result = await readResponseBody(initialResponse);
    if (!initialResponse.ok) {
      throw new Error(
        `결제 전 Signal Provider API 실패 (${initialResponse.status}): ${JSON.stringify(result)}`
      );
    }
    return result;
  }

  const challenge = parseChallenge(await readResponseBody(initialResponse));
  const paymentTransaction = buildSignalProviderUsagePaymentTransaction({
    packageId,
    challenge,
  });

  const paymentResult = await signer.signAndExecuteTransaction({
    transaction: paymentTransaction,
  });
  const paymentDigest = getExecutionDigest(paymentResult);

  const paidResponse = await fetchImpl(signalProviderApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [PAYMENT_HEADER]: paymentDigest,
    },
    body: requestBody,
  });

  const finalResult = await readResponseBody(paidResponse);
  if (!paidResponse.ok) {
    throw new Error(
      `결제(${paymentDigest})는 성공했지만 재요청이 실패했습니다 (${paidResponse.status}).`
    );
  }
  return finalResult;
}

/** x402 mock 결제 영수증 — 데모 피드/티커 표기용. */
export interface X402MockReceipt {
  signalProviderId: string;
  amount: bigint;
  platformFeeAmount: bigint;
  digest: string;
  timestamp: number;
}

/**
 * mock 모드: Provider 서버 없이 같은 흐름(호출→402→결제→재요청)을 시뮬레이션.
 * 데모에서 "x402로 시그널 구매" 순간을 피드에 남길 때 사용한다.
 */
export async function executeSignalProviderWithX402Mock({
  signalProviderId,
  price = 2_000_000n, // 2 USDC (6 decimals)
  platformFeeBps = 2_000n,
}: {
  signalProviderId: string;
  price?: bigint;
  platformFeeBps?: bigint;
}): Promise<X402MockReceipt> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const platformFeeAmount = (price * platformFeeBps) / 10_000n;
  return {
    signalProviderId,
    amount: price,
    platformFeeAmount,
    digest: `mock-x402-${Date.now().toString(36)}`,
    timestamp: Date.now(),
  };
}
