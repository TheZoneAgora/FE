// US-007 리스크 설정 폼의 순수 변환/검증 로직.
// UI 입력은 사람이 읽기 쉬운 단위(USDC, HH:MM)로 받고, RiskPolicy/ExecutionPolicyUpdate는
// 컨트랙트 최소단위(bigint, 분 단위 정수)를 쓰므로 그 경계를 여기서 담당한다.

import type { ExecutionPolicyUpdate, RiskPolicy } from "@/lib/vault/types";
import { DEFAULT_EXECUTION_POLICY_EXTRAS } from "@/lib/vault/types";

const USDC_DECIMALS = 6;
const USDC_SCALE = 1_000_000;

export type TradingWindow = typeof DEFAULT_EXECUTION_POLICY_EXTRAS;

export function formatUsdc(base: bigint): string {
  const value = Number(base) / USDC_SCALE;
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(USDC_DECIMALS);
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

export function parseUsdc(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return BigInt(Math.round(value * USDC_SCALE));
}

export function parseNonNegativeInt(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

export function minutesToClock(totalMinutes: number): string {
  const normalized = ((Math.trunc(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mm = (normalized % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

export function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2)}%`;
}

export function msToSecondsLabel(ms: number): string {
  const sec = ms / 1000;
  return `${Number.isInteger(sec) ? sec.toFixed(0) : sec.toFixed(1)}초`;
}

export function msToMinutesLabel(ms: number): string {
  const min = ms / 60000;
  return `${Number.isInteger(min) ? min.toFixed(0) : min.toFixed(1)}분`;
}

export interface RiskFormState {
  maxTradeAmount: string;
  maxEpochTradeAmount: string;
  maxDailyFiatVolume: string;
  maxLossAmount: string;
  maxRiskScoreBps: string;
  tradingStartTime: string;
  tradingEndTime: string;
  maxPriceDeviationBps: string;
  maxSignalDelayMs: string;
  lossWindowMs: string;
  maxWindowLossAmount: string;
}

export function buildFormState(
  policy: RiskPolicy,
  extras: TradingWindow
): RiskFormState {
  return {
    maxTradeAmount: formatUsdc(policy.maxTradeAmount),
    maxEpochTradeAmount: formatUsdc(policy.maxEpochTradeAmount),
    maxDailyFiatVolume: formatUsdc(policy.maxDailyFiatVolume),
    maxLossAmount: formatUsdc(policy.maxLossAmount),
    maxRiskScoreBps: String(policy.maxRiskScoreBps),
    tradingStartTime: minutesToClock(extras.tradingStartMinuteUtc),
    tradingEndTime: minutesToClock(extras.tradingEndMinuteUtc),
    maxPriceDeviationBps: String(policy.maxPriceDeviationBps),
    maxSignalDelayMs: String(policy.maxSignalDelayMs),
    lossWindowMs: String(policy.lossWindowMs),
    maxWindowLossAmount: formatUsdc(policy.maxWindowLossAmount),
  };
}

export interface ParsedFormValues {
  maxTradeAmount: bigint | null;
  maxEpochTradeAmount: bigint | null;
  maxDailyFiatVolume: bigint | null;
  maxLossAmount: bigint | null;
  maxRiskScoreBps: number | null;
  tradingStartMinuteUtc: number | null;
  tradingEndMinuteUtc: number | null;
  maxPriceDeviationBps: number | null;
  maxSignalDelayMs: number | null;
  lossWindowMs: number | null;
  maxWindowLossAmount: bigint | null;
}

export interface ParsedForm {
  values: ParsedFormValues;
  errors: Partial<Record<keyof RiskFormState, string>>;
}

const NON_NEGATIVE_NUMBER_ERROR = "0 이상의 숫자를 입력하세요.";
const BPS_RANGE_ERROR = "0~10000 사이의 정수를 입력하세요 (10000 = 100%).";
const POSITIVE_INT_ERROR = "0보다 큰 정수를 입력하세요.";
const CLOCK_ERROR = "HH:MM 형식으로 입력하세요.";

export function parseForm(form: RiskFormState): ParsedForm {
  const errors: Partial<Record<keyof RiskFormState, string>> = {};

  const maxTradeAmount = parseUsdc(form.maxTradeAmount);
  if (maxTradeAmount === null) errors.maxTradeAmount = NON_NEGATIVE_NUMBER_ERROR;

  const maxEpochTradeAmount = parseUsdc(form.maxEpochTradeAmount);
  if (maxEpochTradeAmount === null) {
    errors.maxEpochTradeAmount = NON_NEGATIVE_NUMBER_ERROR;
  } else if (maxTradeAmount !== null && maxEpochTradeAmount < maxTradeAmount) {
    errors.maxEpochTradeAmount = "1회 거래 한도보다 크거나 같아야 합니다.";
  }

  const maxDailyFiatVolume = parseUsdc(form.maxDailyFiatVolume);
  if (maxDailyFiatVolume === null) errors.maxDailyFiatVolume = NON_NEGATIVE_NUMBER_ERROR;

  const maxLossAmount = parseUsdc(form.maxLossAmount);
  if (maxLossAmount === null) errors.maxLossAmount = NON_NEGATIVE_NUMBER_ERROR;

  const maxRiskScoreBps = parseNonNegativeInt(form.maxRiskScoreBps);
  if (maxRiskScoreBps === null || maxRiskScoreBps > 10000) {
    errors.maxRiskScoreBps = BPS_RANGE_ERROR;
  }

  const tradingStartMinuteUtc = clockToMinutes(form.tradingStartTime);
  if (tradingStartMinuteUtc === null) errors.tradingStartTime = CLOCK_ERROR;

  const tradingEndMinuteUtc = clockToMinutes(form.tradingEndTime);
  if (tradingEndMinuteUtc === null) errors.tradingEndTime = CLOCK_ERROR;

  const maxPriceDeviationBps = parseNonNegativeInt(form.maxPriceDeviationBps);
  if (maxPriceDeviationBps === null || maxPriceDeviationBps > 10000) {
    errors.maxPriceDeviationBps = BPS_RANGE_ERROR;
  }

  const maxSignalDelayMs = parseNonNegativeInt(form.maxSignalDelayMs);
  if (maxSignalDelayMs === null || maxSignalDelayMs <= 0) {
    errors.maxSignalDelayMs = POSITIVE_INT_ERROR;
  }

  const lossWindowMs = parseNonNegativeInt(form.lossWindowMs);
  if (lossWindowMs === null || lossWindowMs <= 0) {
    errors.lossWindowMs = POSITIVE_INT_ERROR;
  }

  const maxWindowLossAmount = parseUsdc(form.maxWindowLossAmount);
  if (maxWindowLossAmount === null) errors.maxWindowLossAmount = NON_NEGATIVE_NUMBER_ERROR;

  return {
    values: {
      maxTradeAmount,
      maxEpochTradeAmount,
      maxDailyFiatVolume,
      maxLossAmount,
      maxRiskScoreBps,
      tradingStartMinuteUtc,
      tradingEndMinuteUtc,
      maxPriceDeviationBps,
      maxSignalDelayMs,
      lossWindowMs,
      maxWindowLossAmount,
    },
    errors,
  };
}

export function buildDiff(
  values: ParsedFormValues,
  original: RiskPolicy,
  extras: TradingWindow
): ExecutionPolicyUpdate {
  const diff: ExecutionPolicyUpdate = {};

  if (values.maxTradeAmount !== null && values.maxTradeAmount !== original.maxTradeAmount) {
    diff.maxTradeAmount = values.maxTradeAmount;
  }
  if (
    values.maxEpochTradeAmount !== null &&
    values.maxEpochTradeAmount !== original.maxEpochTradeAmount
  ) {
    diff.maxEpochTradeAmount = values.maxEpochTradeAmount;
  }
  if (
    values.maxDailyFiatVolume !== null &&
    values.maxDailyFiatVolume !== original.maxDailyFiatVolume
  ) {
    diff.maxDailyFiatVolume = values.maxDailyFiatVolume;
  }
  if (values.maxLossAmount !== null && values.maxLossAmount !== original.maxLossAmount) {
    diff.maxLossAmount = values.maxLossAmount;
  }
  if (
    values.maxRiskScoreBps !== null &&
    values.maxRiskScoreBps !== original.maxRiskScoreBps
  ) {
    diff.maxRiskScoreBps = values.maxRiskScoreBps;
  }
  if (
    values.tradingStartMinuteUtc !== null &&
    values.tradingStartMinuteUtc !== extras.tradingStartMinuteUtc
  ) {
    diff.tradingStartMinuteUtc = values.tradingStartMinuteUtc;
  }
  if (
    values.tradingEndMinuteUtc !== null &&
    values.tradingEndMinuteUtc !== extras.tradingEndMinuteUtc
  ) {
    diff.tradingEndMinuteUtc = values.tradingEndMinuteUtc;
  }
  if (
    values.maxPriceDeviationBps !== null &&
    values.maxPriceDeviationBps !== original.maxPriceDeviationBps
  ) {
    diff.maxPriceDeviationBps = values.maxPriceDeviationBps;
  }
  if (
    values.maxSignalDelayMs !== null &&
    values.maxSignalDelayMs !== original.maxSignalDelayMs
  ) {
    diff.maxSignalDelayMs = values.maxSignalDelayMs;
  }
  if (values.lossWindowMs !== null && values.lossWindowMs !== original.lossWindowMs) {
    diff.lossWindowMs = values.lossWindowMs;
  }
  if (
    values.maxWindowLossAmount !== null &&
    values.maxWindowLossAmount !== original.maxWindowLossAmount
  ) {
    diff.maxWindowLossAmount = values.maxWindowLossAmount;
  }

  return diff;
}
