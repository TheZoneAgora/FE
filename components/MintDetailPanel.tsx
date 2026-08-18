"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MintRealData, MintTrade, MintStrategySnapshot, MintKalshiTrade } from "@/lib/types/mint";
import { fmtUsd, fmtPct } from "@/lib/format";

const ASSET_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  BTC: "#F7931A",
  XRP: "#00AAE4",
  DOGE: "#C2A633",
};

function assetColor(asset: string) {
  return ASSET_COLORS[asset] ?? "#8b5cf6";
}

export function MintDetailPanel({
  data,
  onClose,
}: {
  data: MintRealData;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const genDate = new Date(data.generatedAt).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  return (
    <AnimatePresence>
      {/* backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* panel */}
      <motion.aside
        key="panel"
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[680px] flex-col overflow-hidden border-l border-line/60 bg-bgDeep shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        aria-label="MINT 상세 패널"
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between border-b border-line/60 px-6 py-4"
          style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.12), transparent)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
              style={{ background: "radial-gradient(circle at 30% 25%, #8b5cf6, #8b5cf688 55%, #8b5cf644)" }}
            >
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[17px] font-bold text-white">MINT</h2>
                <span className="flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-good">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-muted">OKX 페이퍼 · Kalshi 날씨 · 시즌 1 실데이터</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-line/60 text-muted transition hover:border-accent/40 hover:text-white"
            aria-label="패널 닫기"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* ── OKX Portfolio Summary ────────────────────────────── */}
          <Section title="OKX 포트폴리오" subtitle="paper10 · 전략 10개 · 시즌 1">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="자산" value={fmtUsd(data.equityCurve[data.equityCurve.length - 1].equity)} accent="#8b5cf6" />
              <StatCard
                label="시즌 ROI"
                value={fmtPct(data.equityCurve[data.equityCurve.length - 1].roiPct)}
                accent={data.equityCurve[data.equityCurve.length - 1].roiPct >= 0 ? "#34d399" : "#f87171"}
              />
              <StatCard
                label="거래 수 (S1)"
                value={String(data.strategySnapshots.reduce((s, x) => s + x.season1Trades, 0))}
                accent="#06b6d4"
              />
            </div>
          </Section>

          {/* ── Per-Strategy Breakdown ─────────────────────────── */}
          <Section title="전략별 성과" subtitle="시즌 1 ROI 순">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line/40 text-left text-[10px] uppercase tracking-wider text-muted">
                    <th className="pb-2 pr-3">전략</th>
                    <th className="pb-2 pr-3 text-right">자산</th>
                    <th className="pb-2 pr-3 text-right">S1 ROI</th>
                    <th className="pb-2 pr-3 text-right">거래</th>
                    <th className="pb-2 text-right">승률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/20">
                  {data.strategySnapshots.map((s) => (
                    <StrategyRow key={s.strategy} snap={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Recent Trades ─────────────────────────────────── */}
          <Section title="최근 거래" subtitle={`최근 청산 ${data.recentTrades.length}건 · 시즌 1`}>
            <div className="space-y-1.5">
              {data.recentTrades.map((t, i) => (
                <TradeRow key={i} trade={t} />
              ))}
            </div>
          </Section>

          {/* ── Kalshi Weather ───────────────────────────────── */}
          <Section title="Kalshi 날씨" subtitle="기온 예측 시장">
            <div className="mb-3 grid grid-cols-4 gap-3">
              <StatCard label="승률" value={`${data.kalshiSummary.win_rate}%`} accent="#fbbf24" />
              <StatCard
                label="총 손익"
                value={fmtUsd(data.kalshiSummary.total_pnl)}
                accent={data.kalshiSummary.total_pnl >= 0 ? "#34d399" : "#f87171"}
              />
              <StatCard label="ROI" value={`${data.kalshiSummary.roi_pct}%`} accent="#a78bfa" />
              <StatCard label="평균 엣지" value={`${data.kalshiSummary.avg_edge_pct}%`} accent="#06b6d4" />
            </div>
            <div className="space-y-1.5">
              {data.kalshiRecentTrades.map((t) => (
                <KalshiTradeRow key={t.id} trade={t} />
              ))}
            </div>
          </Section>

          {/* ── Footer ──────────────────────────────────────── */}
          <div className="px-6 pb-8 pt-2 text-[10px] text-muted/60">
            데이터 스냅샷: {genDate}. 페이퍼 트레이딩 전용 — 실제 자본 리스크 없음.
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/40 px-6 py-5">
      <div className="mb-3">
        <h3 className="font-display text-[13px] font-bold uppercase tracking-wider text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-wider text-muted">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-line/40 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div className="data mt-0.5 text-[15px] font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function StrategyRow({ snap }: { snap: MintStrategySnapshot }) {
  const color = assetColor(snap.asset);
  const pos = snap.seasonRoiPct >= 0;
  return (
    <tr className="transition-colors hover:bg-white/[0.02]">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: `${color}22`, color }}
          >
            {snap.asset}
          </span>
          <span className="text-muted">{snap.tf}</span>
        </div>
      </td>
      <td className="py-2 pr-3 text-right font-mono text-[11px] text-ink">
        {fmtUsd(snap.currentEquity)}
      </td>
      <td className={`py-2 pr-3 text-right font-mono text-[11px] font-bold ${pos ? "text-good" : "text-bad"}`}>
        {pos ? "+" : ""}{snap.seasonRoiPct.toFixed(1)}%
      </td>
      <td className="py-2 pr-3 text-right text-muted">{snap.season1Trades}</td>
      <td className="py-2 text-right">
        <WinRatePill rate={snap.season1WinRate} total={snap.season1Trades} />
      </td>
    </tr>
  );
}

function WinRatePill({ rate, total }: { rate: number; total: number }) {
  if (total === 0) return <span className="text-muted">—</span>;
  const color = rate >= 55 ? "#34d399" : rate >= 45 ? "#fbbf24" : "#f87171";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}22`, color }}>
      {rate.toFixed(0)}%
    </span>
  );
}

function TradeRow({ trade }: { trade: MintTrade }) {
  const pos = trade.pnl >= 0;
  const asset = trade.strategy.split("-")[0];
  const color = assetColor(asset);
  const timeStr = new Date(trade.ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line/30 bg-white/[0.02] px-3 py-2 text-[11px]">
      {/* asset badge */}
      <span
        className="w-14 flex-shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold"
        style={{ background: `${color}22`, color }}
      >
        {trade.strategy}
      </span>

      {/* side */}
      <span className={`w-10 flex-shrink-0 text-[10px] font-bold uppercase ${trade.side === "long" ? "text-good" : "text-bad"}`}>
        {trade.side === "long" ? "롱" : "숏"}
      </span>

      {/* partial badge */}
      {trade.action === "partial" && (
        <span className="rounded bg-yellow-500/20 px-1 py-0.5 text-[9px] font-bold text-yellow-400">50%</span>
      )}

      {/* entry → exit */}
      <span className="flex-1 font-mono text-muted">
        {trade.entry.toFixed(asset === "BTC" ? 0 : asset === "XRP" || asset === "DOGE" ? 4 : 2)}
        <span className="mx-1 text-muted/40">→</span>
        {trade.exit.toFixed(asset === "BTC" ? 0 : asset === "XRP" || asset === "DOGE" ? 4 : 2)}
      </span>

      {/* lev */}
      <span className="text-muted/60">{trade.leverage}x</span>

      {/* pnl */}
      <span className={`w-20 flex-shrink-0 text-right font-mono font-bold ${pos ? "text-good" : "text-bad"}`}>
        {pos ? "+" : ""}{fmtUsd(trade.pnl)}
      </span>

      {/* time */}
      <span className="hidden w-28 flex-shrink-0 text-right text-muted sm:block">{timeStr}</span>
    </div>
  );
}

function KalshiTradeRow({ trade }: { trade: MintKalshiTrade }) {
  const isWin = trade.outcome === "win";
  const isPending = trade.outcome === "pending";
  const outcomeColor = isPending ? "#fbbf24" : isWin ? "#34d399" : "#f87171";
  const resolvedStr = trade.resolved_at
    ? new Date(trade.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "대기중";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line/30 bg-white/[0.02] px-3 py-2 text-[11px]">
      {/* city */}
      <span className="w-8 flex-shrink-0 font-bold text-muted">{trade.city}</span>

      {/* condition */}
      <span className="flex-1 truncate text-ink">{trade.short_title.replace(/^[A-Z]+ /, "")}</span>

      {/* edge */}
      <span className="text-muted/60 hidden sm:block">엣지: {(trade.edge * 100).toFixed(0)}%</span>

      {/* bet */}
      <span className="text-muted">${trade.bet_amount.toFixed(0)}</span>

      {/* pnl */}
      <span className="w-16 flex-shrink-0 text-right font-mono font-bold" style={{ color: outcomeColor }}>
        {isPending ? "진행중" : (trade.pnl >= 0 ? "+" : "") + fmtUsd(trade.pnl)}
      </span>

      {/* resolved */}
      <span className="hidden w-20 flex-shrink-0 text-right text-muted sm:block">{resolvedStr}</span>
    </div>
  );
}
