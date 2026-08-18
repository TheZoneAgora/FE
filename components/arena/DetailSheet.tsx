"use client";

// design/agora-arena.html의 openDetail()/equitySVG()/delegate() 포팅.

import { useEffect, useRef, useState } from "react";
import { AgentCharacter } from "@/components/arena/characters";
import { fmtPct, fmtUsd } from "@/components/arena/format";
import { burst } from "@/components/arena/confetti";
import { useWalletConnect } from "@/components/arena/WalletConnect";
import { usePrefersReducedMotion } from "@/components/arena/useReducedMotion";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

const CHIPS = [100, 500, 1000, 2500];
const MONTHLY_FEE = 2;

function EquityCurve({ hist, color, reduced }: { hist: number[]; color: string; reduced: boolean }) {
  const w = 560;
  const h = 170;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const span = max - min || 1;
  const px = (i: number) => (i / (hist.length - 1)) * w;
  const py = (v: number) => h - 12 - ((v - min) / span) * (h - 26);
  const pts = hist.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const line = "M" + pts.join(" L");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const lastX = px(hist.length - 1);
  const lastY = py(hist[hist.length - 1]);
  const [drawn, setDrawn] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [reduced, hist.length]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`}>
      <path d={area} fill={color} opacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={drawn ? 0 : 1}
        style={reduced ? undefined : { transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle cx={lastX} cy={lastY} r={4} fill={color}>
        {!reduced && <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />}
      </circle>
      <text x={4} y={14} fill="#8D857B" fontSize={11} fontFamily="Inter">
        {fmtPct(max)}
      </text>
      <text x={4} y={h - 4} fill="#8D857B" fontSize={11} fontFamily="Inter">
        {fmtPct(min)}
      </text>
    </svg>
  );
}

export function DetailSheet({
  agents,
  openAgentId,
  scrollToDelegate,
  onClose,
  onDelegate,
}: {
  agents: ArenaAgent[];
  openAgentId: string | null;
  scrollToDelegate: boolean;
  onClose: () => void;
  onDelegate: (agent: ArenaAgent, amount: number) => void;
}) {
  const wallet = useWalletConnect();
  const reduced = usePrefersReducedMotion();
  const [amount, setAmount] = useState(500);
  const [stage, setStage] = useState<"idle" | "signing" | "submitting">("idle");
  const btnRef = useRef<HTMLButtonElement>(null);
  const delegateAreaRef = useRef<HTMLDivElement>(null);
  const lastAgentRef = useRef<ArenaAgent | null>(null);

  const ranked = [...agents].sort((a, b) => b.score - a.score);
  const liveAgent = agents.find((a) => a.id === openAgentId) ?? null;
  if (liveAgent) lastAgentRef.current = liveAgent;
  const displayAgent = liveAgent ?? lastAgentRef.current;
  const open = liveAgent !== null;
  const rank = displayAgent ? ranked.findIndex((a) => a.id === displayAgent.id) + 1 : 0;

  useEffect(() => {
    if (openAgentId) {
      setAmount(500);
      setStage("idle");
    }
  }, [openAgentId]);

  useEffect(() => {
    if (open && scrollToDelegate) {
      const t = setTimeout(() => {
        delegateAreaRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      }, 550);
      return () => clearTimeout(t);
    }
  }, [open, scrollToDelegate, reduced]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!displayAgent) {
    return (
      <>
        <div className="overlay" />
        <div className="sheet" role="dialog" aria-modal="true" />
      </>
    );
  }

  const agent = displayAgent;
  const risk = Math.round(amount * 0.08);

  function handleDelegateClick() {
    if (stage !== "idle") return;
    const run = () => {
      setStage("signing");
      setTimeout(() => {
        setStage("submitting");
        setTimeout(() => {
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            burst(r.left + r.width / 2, r.top + r.height / 2, reduced);
          }
          setStage("idle");
          onDelegate(agent, amount);
        }, 900);
      }, 900);
    };
    if (!wallet.connected) {
      wallet.requestConnect(run);
    } else {
      run();
    }
  }

  return (
    <>
      <div className={`overlay${open ? " on" : ""}`} onClick={onClose} />
      <div className={`sheet${open ? " on" : ""}`} role="dialog" aria-modal="true">
        <div className="sheet-grab" />
        <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
          ✕
        </button>
        <div>
          <div className="dt-head">
            <div className="dt-char">
              <AgentCharacter agentId={agent.id} size={92} label={agent.name} />
            </div>
            <div>
              <div className="dt-name">
                {agent.name}{" "}
                {agent.real ? (
                  <span className="tag real">REAL · Mac mini에서 실거래 중</span>
                ) : (
                  <span className="tag">SIMULATED</span>
                )}
              </div>
              <div className="dt-strat">
                {agent.strat} · 백커 <b className="num">{agent.backers.toLocaleString()}</b>명 · 위임 자본{" "}
                <b className="num">{fmtUsd(agent.aum)}</b>
              </div>
            </div>
            <div className="dt-rank">
              <div className="r num">#{rank}</div>
              <div className="k">AGORA {agent.score}점</div>
            </div>
          </div>

          <div className="dt-stats">
            <div className="dst">
              <div className={`v num ${agent.ret >= 0 ? "up" : "dn"}`}>{fmtPct(agent.ret)}</div>
              <div className="k">시즌 수익률</div>
            </div>
            <div className="dst">
              <div className="v num dn">−{agent.mdd.toFixed(1)}%</div>
              <div className="k">최대 낙폭 (MDD)</div>
            </div>
            <div className="dst">
              <div className="v num">{agent.win}%</div>
              <div className="k">승률</div>
            </div>
            <div className="dst">
              <div className="v num">{MONTHLY_FEE} USDC</div>
              <div className="k">월 사용료 · x402</div>
            </div>
          </div>

          <div className="equity">
            <h4>
              <span>EQUITY CURVE · SEASON 1</span>
              <span className="num">$10,000 기준</span>
            </h4>
            <EquityCurve hist={agent.hist} color={agent.accent} reduced={reduced} />
          </div>

          <div className="safety">
            <h4>온체인 안전장치 — 약속이 아니라 코드</h4>
            <ul>
              <li>
                <span>
                  <b>출금 권한 0.</b> {agent.name}는 당신의 Vault에서 돈을 뺄 수 없습니다.
                </span>
              </li>
              <li>
                <span>
                  <b>1회 · epoch 한도.</b> 하루 손실 노출은 위임금의 8%로 상한.
                </span>
              </li>
              <li>
                <span>
                  <b>결과도 Vault로.</b> 거래 결과 자산은 Agent가 아닌 내 Vault에 귀속.
                </span>
              </li>
              <li>
                <span>
                  <b>즉시 해지.</b> 서명 한 번으로 중지 + 전액 회수.
                </span>
              </li>
            </ul>
          </div>

          <div className="delegate" ref={delegateAreaRef}>
            <h4>얼마나 맡길까요?</h4>
            <div className="amount-row">
              <div className="amount-display num">
                {amount.toLocaleString()} <small>USDC</small>
              </div>
              <div className="chips">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip-btn num${amount === c ? " on" : ""}`}
                    onClick={() => setAmount(c)}
                  >
                    {c.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ "--fill": `${((amount - 50) / (5000 - 50)) * 100}%` } as React.CSSProperties}
            />
            <div className="dg-meta">
              <span className="m">
                최대 일일 노출 <b className="num">{risk.toLocaleString()} USDC (8%)</b>
              </span>
              <span className="m">
                월 사용료 <b className="num">{MONTHLY_FEE} USDC</b>
              </span>
              <span className="m">
                수익 배분 <b className="num">나 100% − 사용료</b>
              </span>
            </div>
            <div className="dg-cta">
              <button
                type="button"
                className="btn primary big"
                ref={btnRef}
                disabled={stage !== "idle"}
                onClick={handleDelegateClick}
              >
                {stage === "idle" && `${agent.name}에게 맡기기`}
                {stage === "signing" && (
                  <>
                    <span className="spin" /> Vault 서명 중…
                  </>
                )}
                {stage === "submitting" && (
                  <>
                    <span className="spin" /> 권한 위임 트랜잭션 제출…
                  </>
                )}
              </button>
              <span className="dg-note">서명 2회 · 약 30초 · 언제든 해지</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
