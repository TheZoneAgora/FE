"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/vault/Modal";
import { formatSui, formatUsdc } from "@/components/vault/format";
import { getPriceFeed } from "@/lib/live/PriceFeed";
import type { VaultState } from "@/lib/vault/types";
import type { EmergencyLiquidateAllParams } from "@/lib/vault/VaultDataSource";

// 시장가 청산 시 자동 적용하는 슬리피지 허용치.
const SLIPPAGE_BPS = 100; // 1%

/** 시세가 없거나 0/음수면 반드시 0n을 반환해, 0으로 청산이 실행되는 일을 코드로 차단한다. */
function computeMinFiatOutput(cryptoBalance: bigint, suiPriceUsd: number | null): bigint {
  if (suiPriceUsd === null || !Number.isFinite(suiPriceUsd) || suiPriceUsd <= 0) return 0n;
  if (cryptoBalance <= 0n) return 0n;
  const priceMicros = BigInt(Math.round(suiPriceUsd * 1_000_000)); // USDC 6dp per 1 SUI
  const grossFiat = (cryptoBalance * priceMicros) / 1_000_000_000n; // MIST(9dp) -> USDC(6dp)
  const bpsAfterSlippage = BigInt(10_000 - SLIPPAGE_BPS);
  return (grossFiat * bpsAfterSlippage) / 10_000n;
}

type ResultSummary =
  | { kind: "liquidate"; fiatReceived: bigint }
  | { kind: "withdraw"; fiatWithdrawn: bigint };

export function EmergencyExitModal({
  open,
  onClose,
  vault,
  onLiquidateAll,
  onPauseAndWithdraw,
}: {
  open: boolean;
  onClose: () => void;
  vault: VaultState;
  onLiquidateAll: (params: EmergencyLiquidateAllParams) => Promise<VaultState>;
  onPauseAndWithdraw: () => Promise<VaultState>;
}) {
  const [suiPrice, setSuiPrice] = useState<number | null>(null);
  const [liquidateConfirm, setLiquidateConfirm] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState("");
  const [busy, setBusy] = useState<"liquidate" | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultSummary | null>(null);

  // 모달이 열려 있는 동안 실시세를 계속 따라간다 (getPriceFeed 스냅샷 + 구독).
  useEffect(() => {
    if (!open) return;
    const feed = getPriceFeed();
    setSuiPrice(feed.getSnapshot().prices.SUIUSDT ?? null);
    return feed.subscribe((tick) => setSuiPrice(tick.prices.SUIUSDT ?? null));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLiquidateConfirm("");
      setWithdrawConfirm("");
      setError(null);
      setResult(null);
      setBusy(null);
    }
  }, [open]);

  const minFiatOutput = useMemo(
    () => computeMinFiatOutput(vault.cryptoBalance, suiPrice),
    [vault.cryptoBalance, suiPrice]
  );

  const hasCrypto = vault.cryptoBalance > 0n;
  const canLiquidate =
    hasCrypto && minFiatOutput > 0n && liquidateConfirm === "청산" && busy === null;
  const canWithdraw = withdrawConfirm === "회수" && busy === null;

  async function handleLiquidate() {
    if (!canLiquidate) return;
    setBusy("liquidate");
    setError(null);
    try {
      const before = vault.fiatBalance;
      const next = await onLiquidateAll({ minFiatOutput });
      setResult({ kind: "liquidate", fiatReceived: next.fiatBalance - before });
    } catch (e) {
      setError(e instanceof Error ? e.message : "청산에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdraw() {
    if (!canWithdraw) return;
    setBusy("withdraw");
    setError(null);
    try {
      const before = vault.fiatBalance;
      const next = await onPauseAndWithdraw();
      setResult({ kind: "withdraw", fiatWithdrawn: before - next.fiatBalance });
    } catch (e) {
      setError(e instanceof Error ? e.message : "회수에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="긴급탈출">
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 className="font-display text-lg font-bold text-negative">긴급탈출</h2>
        <p className="mt-1 text-[13px] text-muted-light">
          에이전트를 즉시 멈추고 자산을 확보합니다. 되돌릴 수 없는 작업이니 신중히 선택하세요.
        </p>

        {result ? (
          <div className="mt-6 rounded-2xl border border-negative/30 bg-negative/10 p-4">
            <p className="text-[13px] font-semibold text-negative">
              {result.kind === "liquidate" ? "전량 청산 완료" : "정지 + USDC 회수 완료"}
            </p>
            <p className="tabular-nums mt-1 text-[20px] font-bold text-warm-ivory">
              {formatUsdc(result.kind === "liquidate" ? result.fiatReceived : result.fiatWithdrawn)} USDC
            </p>
            <p className="mt-1 text-[12px] text-muted-light">에이전트 상태: 정지됨</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-4 text-[13px] font-semibold text-warm-ivory hover:bg-white/15"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 경로 1: 전량 청산 */}
            <div className="flex flex-col rounded-2xl border border-negative/30 bg-negative/[0.06] p-4">
              <h3 className="text-[13px] font-bold text-negative">전량 청산</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-light">
                보유 SUI 전량을 시장가로 매도해 USDC로 전환합니다. 청산 완료 후 에이전트는 자동으로
                정지됩니다.
              </p>

              <div className="mt-3 space-y-1 rounded-xl bg-black/25 p-3 text-[12px]">
                <Row label="청산 대상" value={`${formatSui(vault.cryptoBalance)} SUI`} />
                <Row
                  label="현재 시세"
                  value={suiPrice && suiPrice > 0 ? `$${suiPrice.toFixed(4)}` : "시세 조회 중"}
                />
                <Row
                  label="최소 수령액 (1% 슬리피지)"
                  value={suiPrice && suiPrice > 0 ? `${formatUsdc(minFiatOutput)} USDC` : "—"}
                  emphasize
                />
              </div>

              {!hasCrypto ? (
                <p className="mt-3 text-[12px] text-muted-light">청산할 SUI 보유량이 없습니다.</p>
              ) : (
                <>
                  <label className="mt-3 block text-[11px] font-medium text-muted-light">
                    확인을 위해 <span className="text-warm-ivory">&quot;청산&quot;</span>을 입력하세요
                    <input
                      value={liquidateConfirm}
                      onChange={(e) => setLiquidateConfirm(e.target.value)}
                      placeholder="청산"
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-[14px] text-warm-ivory outline-none focus:border-negative"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleLiquidate}
                    disabled={!canLiquidate}
                    className="mt-3 flex min-h-[44px] items-center justify-center rounded-xl bg-negative px-4 text-[13px] font-semibold text-warm-ivory transition-opacity disabled:opacity-40"
                  >
                    {busy === "liquidate"
                      ? "청산 중…"
                      : !(suiPrice && suiPrice > 0)
                        ? "시세 조회 중"
                        : minFiatOutput === 0n
                          ? "청산 금액이 너무 작습니다"
                          : "전량 청산 실행"}
                  </button>
                </>
              )}
            </div>

            {/* 경로 2: 정지 + USDC 회수 */}
            <div className="flex flex-col rounded-2xl border border-negative/30 bg-negative/[0.06] p-4">
              <h3 className="text-[13px] font-bold text-negative">정지 + USDC 회수</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-light">
                에이전트를 즉시 정지하고 보유 USDC만 지갑으로 회수합니다. SUI 포지션은 그대로
                유지됩니다.
              </p>

              <div className="mt-3 space-y-1 rounded-xl bg-black/25 p-3 text-[12px]">
                <Row label="회수 대상" value={`${formatUsdc(vault.fiatBalance)} USDC`} emphasize />
                <Row label="유지되는 SUI" value={`${formatSui(vault.cryptoBalance)} SUI`} />
              </div>

              <label className="mt-3 block text-[11px] font-medium text-muted-light">
                확인을 위해 <span className="text-warm-ivory">&quot;회수&quot;</span>를 입력하세요
                <input
                  value={withdrawConfirm}
                  onChange={(e) => setWithdrawConfirm(e.target.value)}
                  placeholder="회수"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-[14px] text-warm-ivory outline-none focus:border-negative"
                />
              </label>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={!canWithdraw}
                className="mt-3 rounded-xl bg-negative px-4 py-2.5 text-[13px] font-semibold text-warm-ivory transition-opacity disabled:opacity-40"
              >
                {busy === "withdraw" ? "회수 중…" : "정지 + 회수 실행"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[12px] text-negative">{error}</p>}

        {!result && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 text-[13px] font-semibold text-muted-light hover:text-warm-ivory"
          >
            취소하고 닫기
          </button>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-light">{label}</span>
      <span className={`tabular-nums font-semibold ${emphasize ? "text-warm-ivory" : "text-muted-light"}`}>
        {value}
      </span>
    </div>
  );
}
