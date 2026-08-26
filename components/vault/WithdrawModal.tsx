"use client";

import { useState } from "react";
import { Modal } from "@/components/vault/Modal";
import { formatSui, formatUsdc, parseDecimalToBigInt } from "@/components/vault/format";

// 출금 대상. crypto는 Agent를 멈춘 뒤 포지션을 코인째 빼올 때 쓴다 —
// 전액 출금은 fiat·crypto를 한꺼번에 비우므로 부분 회수 경로가 따로 필요하다.
type WithdrawMode = "fiat" | "crypto" | "all";

export function WithdrawModal({
  open,
  onClose,
  fiatBalance,
  cryptoBalance,
  onSubmitAmount,
  onSubmitCrypto,
  onSubmitAll,
}: {
  open: boolean;
  onClose: () => void;
  fiatBalance: bigint;
  cryptoBalance: bigint;
  onSubmitAmount: (amount: bigint) => Promise<unknown>;
  onSubmitCrypto: (amount: bigint) => Promise<unknown>;
  onSubmitAll: () => Promise<unknown>;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<WithdrawMode>("fiat");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCrypto = mode === "crypto";
  // USDC는 6, SUI는 9 decimals다. 자릿수를 섞으면 조용히 1000배 틀린 금액이 나간다.
  const parsed = parseDecimalToBigInt(input, isCrypto ? 9 : 6);
  const available = isCrypto ? cryptoBalance : fiatBalance;
  const valid =
    mode === "all"
      ? fiatBalance > 0n || cryptoBalance > 0n
      : parsed !== null && parsed > 0n && parsed <= available;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "all") await onSubmitAll();
      else if (parsed !== null) {
        await (isCrypto ? onSubmitCrypto(parsed) : onSubmitAmount(parsed));
      }
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
          {cryptoBalance > 0n && (
            <>
              {" · "}
              <span className="tabular-nums">{formatSui(cryptoBalance)}</span> 코인
            </>
          )}
        </p>

        <div className="mt-5 flex items-center gap-2">
          {(
            [
              ["fiat", "USDC"],
              ["crypto", "코인"],
              ["all", "전액 출금"],
            ] as Array<[WithdrawMode, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setInput("");
                setError(null);
              }}
              className={`flex min-h-[44px] items-center rounded-full px-3 text-[12px] font-semibold ${
                mode === value
                  ? "bg-agora-orange text-arena-black"
                  : "border border-white/15 text-muted-light"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode !== "all" && (
          <label className="mt-4 block text-[12px] font-medium text-muted-light">
            금액 ({isCrypto ? "코인" : "USDC"})
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
