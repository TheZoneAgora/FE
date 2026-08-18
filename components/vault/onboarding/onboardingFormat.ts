// 온보딩 입력 전용 USDC(6 decimals) 파싱/표시 헬퍼.
// components/vault/format.ts와 달리, 6자리 초과 소수는 거부하지 않고 잘라내고
// 표시할 때 불필요한 소수점 0을 붙이지 않는다 (입력 중 값이 튀지 않게 하려는 의도).

const USDC_DECIMALS = 6;
const USDC_BASE_UNITS = 10n ** BigInt(USDC_DECIMALS);

/** 사용자 입력 문자열을 USDC 최소단위 bigint로 파싱한다. 잘못된 형식이면 null. */
export function parseUsdcInput(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;

  const [intPart, fracPart = ""] = trimmed.split(".");
  const frac = fracPart.slice(0, USDC_DECIMALS).padEnd(USDC_DECIMALS, "0");

  try {
    return BigInt(intPart || "0") * USDC_BASE_UNITS + BigInt(frac);
  } catch {
    return null;
  }
}

/** 숫자·소수점만 남기고 사용자가 타이핑한 값을 정리한다 (입력 필드용). */
export function sanitizeUsdcInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

/** USDC 최소단위 bigint를 화면 표시용 문자열로 변환한다 (천단위 구분, 소수점 최대 2자리). */
export function formatUsdcDisplay(amount: bigint): string {
  const value = Number(amount) / Number(USDC_BASE_UNITS);
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
