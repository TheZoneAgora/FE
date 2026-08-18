"use client";

import { useState } from "react";
import { Modal } from "@/components/vault/Modal";
import { formatUsdc, parseDecimalToBigInt } from "@/components/vault/format";

export function WithdrawModal({
  open,
  onClose,
  fiatBalance,
  onSubmitAmount,
  onSubmitAll,
}: {
  open: boolean;
  onClose: () => void;
  fiatBalance: bigint;
  onSubmitAmount: (amount: bigint) => Promise<unknown>;
  onSubmitAll: () => Promise<unknown>;
}) {
  const [input, setInput] = useState("");
  const [full, setFull] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseDecimalToBigInt(input, 6);
  const valid = full ? fiatBalance > 0n : parsed !== null && parsed > 0n && parsed <= fiatBalance;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      if (full) await onSubmitAll();
      else if (parsed !== null) await onSubmitAmount(parsed);
      setInput("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "출금에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="출금">
      <div className="p-6">
        <h2 className="font-display text-lg font-bold text-warm-ivory">출금</h2>
        <p className="mt-1 text-[13px] text-muted-light">
          사용 가능 잔액: <span className="tabular-nums">{formatUsdc(fiatBalance)}</span> USDC
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFull(false)}
            className={`flex min-h-[44px] items-center rounded-full px-3 text-[12px] font-semibold ${
              !full ? "bg-agora-orange text-arena-black" : "border border-white/15 text-muted-light"
            }`}
          >
            직접 입력
          </button>
          <button
            type="button"
            onClick={() => setFull(true)}
            className={`flex min-h-[44px] items-center rounded-full px-3 text-[12px] font-semibold ${
              full ? "bg-agora-orange text-arena-black" : "border border-white/15 text-muted-light"
            }`}
          >
            전액 출금
          </button>
        </div>

        {!full && (
          <label className="mt-4 block text-[12px] font-medium text-muted-light">
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
        )}

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
            {submitting ? "처리 중…" : "출금하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
