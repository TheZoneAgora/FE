"use client";

import { motion } from "framer-motion";
import { DEFAULT_RISK_POLICY } from "@/lib/vault/types";
import { AgentCharacter } from "@/components/arena/characters";
import { formatUsdcDisplay } from "./onboardingFormat";

const POLICY_ROWS = [
  { label: "1회 거래 한도", value: `${formatUsdcDisplay(DEFAULT_RISK_POLICY.maxTradeAmount)} USDC` },
  { label: "Epoch 거래 한도", value: `${formatUsdcDisplay(DEFAULT_RISK_POLICY.maxEpochTradeAmount)} USDC` },
  { label: "일일 거래대금 한도", value: `${formatUsdcDisplay(DEFAULT_RISK_POLICY.maxDailyFiatVolume)} USDC` },
  { label: "최대 손실 한도", value: `${formatUsdcDisplay(DEFAULT_RISK_POLICY.maxLossAmount)} USDC` },
  { label: "위험도 상한", value: `${DEFAULT_RISK_POLICY.maxRiskScoreBps / 100}%` },
  {
    label: "Kill Switch",
    value: `${DEFAULT_RISK_POLICY.lossWindowMs / (60 * 60 * 1000)}시간 내 ${formatUsdcDisplay(
      DEFAULT_RISK_POLICY.maxWindowLossAmount
    )} USDC 손실 시 작동`,
  },
] as const;

interface ConfirmStepProps {
  depositAmount: bigint;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmStep({
  depositAmount,
  submitting,
  error,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[24px] border border-white/10 bg-surface-dark px-8 py-10"
    >
      <div className="flex items-center gap-3">
        <AgentCharacter agentId="mint" size={48} />
        <h1 className="font-display text-xl font-bold tracking-tight text-warm-ivory">
          내용을 확인해 주세요
        </h1>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-[16px] border border-white/10 bg-arena-black px-5 py-4">
        <span className="text-[13px] font-medium text-muted-light">
          예치 금액
        </span>
        <span className="font-mono text-[20px] font-semibold tabular-nums text-warm-ivory">
          {formatUsdcDisplay(depositAmount)} USDC
        </span>
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-light">
          기본 리스크 정책
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          {POLICY_ROWS.map((row, i) => (
            <div
              key={row.label}
              className="flex items-start gap-3.5 rounded-[16px] border border-white/10 bg-arena-black px-4 py-3.5"
            >
              <span className="flex-shrink-0 font-display text-[15px] font-extrabold text-agora-orange">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h5 className="text-[13px] font-semibold text-warm-ivory">
                  {row.label}
                </h5>
                <p className="mt-0.5 font-mono text-[13px] tabular-nums text-muted-light">
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-light">
          리스크 설정에서 언제든 조정할 수 있습니다.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-[12px] border border-negative/30 bg-negative/10 px-4 py-3 text-[13px] text-negative">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="rounded-[12px] border border-white/15 px-5 py-3 text-[14px] font-semibold text-muted-light transition-colors duration-200 hover:text-warm-ivory disabled:cursor-not-allowed disabled:opacity-30"
        >
          뒤로
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onConfirm}
          className="rounded-[12px] bg-agora-orange px-6 py-3 text-[14px] font-semibold text-arena-black transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "생성 중..." : error ? "다시 시도" : "볼트 만들기"}
        </button>
      </div>
    </motion.div>
  );
}
