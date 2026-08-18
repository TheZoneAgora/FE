"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VaultActivityEvent, VaultActivityEventType } from "@/lib/vault/types";
import { formatRelativeTime, formatSui, formatUsdc } from "@/components/vault/format";

type Tone = "neutral" | "positive" | "negative";

const EVENT_META: Record<VaultActivityEventType, { label: string; tone: Tone }> = {
  SignalReceived: { label: "시그널 수신", tone: "neutral" },
  SignalVerified: { label: "시그널 검증 완료", tone: "positive" },
  SignalRejected: { label: "시그널 거부", tone: "negative" },
  OrderExecuted: { label: "주문 체결", tone: "positive" },
  DeepBookOrderExecuted: { label: "DeepBook 체결", tone: "positive" },
  KillSwitchTriggered: { label: "킬 스위치 작동", tone: "negative" },
  EmergencyLiquidated: { label: "긴급 전량 청산", tone: "negative" },
  EmergencyFiatWithdrawn: { label: "긴급 USDC 회수", tone: "negative" },
  DepositReceived: { label: "입금", tone: "neutral" },
  WithdrawalExecuted: { label: "출금", tone: "neutral" },
  AgentRevoked: { label: "에이전트 정지", tone: "neutral" },
  AgentReactivated: { label: "에이전트 재개", tone: "neutral" },
  ReduceOnlyUpdated: { label: "축소 전용 모드 변경", tone: "neutral" },
  PolicyUpdated: { label: "정책 변경", tone: "neutral" },
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-neutral-data",
  positive: "text-positive",
  negative: "text-negative",
};

const TONE_CARD: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[0.03]",
  positive: "border-positive/30 bg-positive/10",
  negative: "border-negative/30 bg-negative/10",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-neutral-data",
  positive: "bg-positive",
  negative: "bg-negative",
};

function ToneIcon({ type, tone }: { type: VaultActivityEventType; tone: Tone }) {
  const cls = `h-4 w-4 ${TONE_TEXT[tone]}`;
  switch (type) {
    case "SignalVerified":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M5 12.5L10 17L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      );
    case "SignalRejected":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      );
    case "OrderExecuted":
    case "DeepBookOrderExecuted":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path
            d="M4 17L10 11L14 15L20 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case "KillSwitchTriggered":
    case "EmergencyLiquidated":
    case "EmergencyFiatWithdrawn":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M12 4L21 20H3L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
          <path d="M12 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" />
        </svg>
      );
    case "DepositReceived":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M12 5V19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      );
    case "WithdrawalExecuted":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M12 19V5M12 5L7 10M12 5L17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      );
    case "AgentRevoked":
    case "AgentReactivated":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "PolicyUpdated":
    case "ReduceOnlyUpdated":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
      );
    case "SignalReceived":
    default:
      return <span className={`inline-block h-2 w-2 rounded-full ${TONE_DOT[tone]}`} aria-hidden />;
  }
}

function describeEvent(event: VaultActivityEvent): string {
  const p = event.payload as Record<string, unknown>;
  const side = typeof p.side === "string" ? p.side : undefined;
  const symbol = typeof p.symbol === "string" ? p.symbol : undefined;
  const price = typeof p.price === "number" ? p.price : undefined;
  const priceLabel = price !== undefined ? `@ ${price.toFixed(4)}` : null;
  const sideLine = [side, symbol, priceLabel].filter(Boolean).join(" ");

  switch (event.type) {
    case "SignalReceived":
    case "SignalVerified":
      return sideLine;
    case "SignalRejected": {
      const reason = typeof p.reason === "string" ? `사유: ${p.reason}` : null;
      return [sideLine, reason].filter(Boolean).join(" · ");
    }
    case "OrderExecuted":
    case "DeepBookOrderExecuted": {
      const amount = typeof p.amount === "string" ? `${formatUsdc(BigInt(p.amount))} USDC` : null;
      return [sideLine, amount].filter(Boolean).join(" · ");
    }
    case "EmergencyLiquidated": {
      const crypto =
        typeof p.cryptoLiquidated === "string" ? `${formatSui(BigInt(p.cryptoLiquidated))} SUI 청산` : null;
      const fiat =
        typeof p.fiatReceived === "string" ? `${formatUsdc(BigInt(p.fiatReceived))} USDC 수령` : null;
      return [crypto, fiat].filter(Boolean).join(" · ");
    }
    case "EmergencyFiatWithdrawn":
      return typeof p.fiatWithdrawn === "string" ? `${formatUsdc(BigInt(p.fiatWithdrawn))} USDC 회수` : "";
    case "DepositReceived":
      return typeof p.amount === "string" ? `${formatUsdc(BigInt(p.amount))} USDC 입금` : "";
    case "WithdrawalExecuted": {
      const fiat = typeof p.fiatWithdrawn === "string" ? `${formatUsdc(BigInt(p.fiatWithdrawn))} USDC` : null;
      const crypto = typeof p.cryptoWithdrawn === "string" ? `${formatSui(BigInt(p.cryptoWithdrawn))} SUI` : null;
      return [fiat, crypto].filter(Boolean).join(" + ");
    }
    case "ReduceOnlyUpdated":
      return p.reduceOnly ? "축소 전용 모드 켜짐" : "축소 전용 모드 꺼짐";
    case "PolicyUpdated": {
      const changed = Array.isArray(p.changed) ? (p.changed as string[]) : [];
      return changed.length ? `변경 항목: ${changed.join(", ")}` : "";
    }
    default:
      return "";
  }
}

export function ActivityFeed({ activity }: { activity: VaultActivityEvent[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex max-h-[520px] flex-col rounded-3xl border border-white/10 bg-surface-dark">
      <header className="border-b border-white/10 px-5 py-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-light">
          활동 피드
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {activity.length === 0 ? (
          <div className="px-2 py-8 text-center text-[13px] text-muted-light">아직 활동이 없습니다.</div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {activity.map((event) => {
                const meta = EVENT_META[event.type];
                const detail = describeEvent(event);
                return (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${TONE_CARD[meta.tone]}`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-black/20">
                      <ToneIcon type={event.type} tone={meta.tone} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] font-semibold ${TONE_TEXT[meta.tone]}`}>
                          {meta.label}
                        </span>
                        <span className="tabular-nums flex-shrink-0 text-[11px] text-muted-light">
                          {formatRelativeTime(event.timestamp, now)}
                        </span>
                      </div>
                      {detail && <p className="mt-0.5 truncate text-[12px] text-muted-light">{detail}</p>}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
