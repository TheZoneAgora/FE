"use client";

import { useState } from "react";
import { Modal } from "@/components/vault/Modal";
import { parseDecimalToBigInt } from "@/components/vault/format";
import { tradingFeePercentLabel } from "@/lib/config/env";

export function DepositModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: bigint) => Promise<unknown>;
}) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseDecimalToBigInt(input, 6);
  const valid = amount !== null && amount > 0n;

  async function handleSubmit() {
    if (!valid || amount === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(amount);
      setInput("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "입금에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="입금">
      <div className="p-6">
        <h2 className="font-display text-lg font-bold text-warm-ivory">입금</h2>
        <p className="mt-1 text-[13px] text-muted-light">볼트에 USDC를 추가로 입금합니다.</p>
        <p className="mt-1 text-[12px] text-muted-light">
          입금에는 수수료가 없습니다. 거래가 체결될 때마다 체결 금액의{" "}
          <span className="tabular-nums">{tradingFeePercentLabel()}</span>가 수수료로 차감됩니다.
        </p>
        <label className="mt-5 block text-[12px] font-medium text-muted-light">
          금액 (USDC)
          <input
            autoFocus
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0.00"
            className="tabular-nums mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-[15px] text-warm-ivory outline-none focus:border-agora-orange"
          />
        </label>
        {error && <p className="mt-2 text-[12px] text-negative">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-muted-light hover:text-warm-ivory"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-agora-orange px-4 text-[13px] font-semibold text-arena-black transition-opacity disabled:opacity-40"
          >
            {submitting ? "처리 중…" : "입금하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
