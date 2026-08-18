"use client";

import { motion } from "framer-motion";
import { sanitizeUsdcInput } from "./onboardingFormat";

interface DepositStepProps {
  value: string;
  onChange: (value: string) => void;
  minUsdc: number;
  valid: boolean;
  onNext: () => void;
}

export function DepositStep({
  value,
  onChange,
  minUsdc,
  valid,
  onNext,
}: DepositStepProps) {
  const showMinError = value.trim().length > 0 && !valid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[24px] border border-white/10 bg-surface-dark px-8 py-10"
    >
      <h1 className="font-display text-xl font-bold tracking-tight text-warm-ivory">
        얼마를 예치할까요?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-light">
        Agora가 검증한 시그널로만 자동 운용되며, 출금 권한은 항상 내게
        있습니다.
      </p>

      <div className="mt-8">
        <label
          htmlFor="deposit-amount"
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-light"
        >
          예치 금액 (USDC)
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-white/10 bg-arena-black px-4 py-3">
          <input
            id="deposit-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(sanitizeUsdcInput(e.target.value))}
            className="w-full bg-transparent font-mono text-[20px] font-semibold tabular-nums text-warm-ivory outline-none placeholder:text-muted-light/60"
          />
          <span className="shrink-0 font-mono text-[13px] font-medium text-muted-light">
            USDC
          </span>
        </div>
        {showMinError ? (
          <p className="mt-2 text-[13px] text-negative">
            최소 {minUsdc} USDC 이상 입력해 주세요.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-muted-light">
            최소 예치 금액은 {minUsdc} USDC입니다.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!valid}
          onClick={onNext}
          className="rounded-[12px] bg-agora-orange px-6 py-3 text-[14px] font-semibold text-arena-black transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </motion.div>
  );
}
