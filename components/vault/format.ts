// 볼트 UI 전용 표시 포맷 헬퍼. lib/vault, lib/live는 읽기만 하고
// 화면 표시용 변환(bigint → 문자열, 상대 시각 등)은 여기 모아둔다.

const USDC_DECIMALS = 6;
const SUI_DECIMALS = 9;

export function formatBigDecimal(
  amount: bigint,
  decimals: number,
  fractionDigits = 2
): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, fractionDigits)
    .padEnd(fractionDigits, "0");
  const wholeStr = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeStr}${fractionDigits > 0 ? `.${fracStr}` : ""}`;
}

export function formatUsdc(amount: bigint, fractionDigits = 2): string {
  return formatBigDecimal(amount, USDC_DECIMALS, fractionDigits);
}

export function formatSui(amount: bigint, fractionDigits = 4): string {
  return formatBigDecimal(amount, SUI_DECIMALS, fractionDigits);
}

export function bigintToDisplayNumber(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

/** 사용자 입력 소수 문자열을 최소단위 bigint로 변환. 형식이 어긋나면 null(부분 자름 없이 거부). */
export function parseDecimalToBigInt(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) return null;
  const paddedFrac = frac.padEnd(decimals, "0");
  try {
    return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(paddedFrac || "0");
  } catch {
    return null;
  }
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  if (diffMs < 45_000) return "방금 전";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.round(hours / 24);
  return `${days}일 전`;
}
