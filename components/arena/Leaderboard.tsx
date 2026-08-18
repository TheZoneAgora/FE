"use client";

// design/agora-arena.html의 buildBoard()/updateBoard() 포팅.
// 순위 재정렬 애니메이션(원본의 수동 FLIP)은 framer-motion의 layout prop으로 대체.

import { motion } from "framer-motion";
import { useRef } from "react";
import { AgentCharacter } from "@/components/arena/characters";
import { fmtPct } from "@/components/arena/format";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

const RING_CIRC = 138.2;

function Spark({ hist, color }: { hist: number[]; color: string }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const span = max - min || 1;
  const pts = hist
    .map(
      (v, i) =>
        `${((i / (hist.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Leaderboard({
  agents,
  onSelect,
  onDelegateClick,
}: {
  agents: ArenaAgent[];
  onSelect: (agentId: string) => void;
  onDelegateClick: (agentId: string) => void;
}) {
  const ranked = [...agents].sort((a, b) => b.score - a.score);
  const prevRank = useRef<Record<string, number>>({});

  return (
    <div className="lb" id="lbRows">
      {ranked.map((a, i) => {
        const rank = i + 1;
        const prev = prevRank.current[a.id];
        prevRank.current[a.id] = rank;
        let delta: "up" | "dn" | "flat" = "flat";
        if (prev !== undefined && prev !== rank) delta = rank < prev ? "up" : "dn";

        return (
          <motion.div
            key={a.id}
            layout
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`lb-row${rank === 1 ? " first" : ""}`}
            onClick={() => onSelect(a.id)}
          >
            <div className="lb-rank num">
              <span className="rk">{rank}</span>
              <span className={`delta ${delta}`}>{delta === "up" ? "▲" : delta === "dn" ? "▼" : "·"}</span>
            </div>
            <div className="lb-char">
              <AgentCharacter agentId={a.id} size={56} label={a.name} />
            </div>
            <div className="lb-main">
              <div className="lb-id">
                <div className="lb-name">
                  {a.name} {a.real ? <span className="tag real">REAL</span> : <span className="tag">SIM</span>}
                </div>
                <div className="lb-strat">{a.strat}</div>
              </div>
              <div className="lb-spark">
                <Spark hist={a.hist} color={a.accent} />
              </div>
              <div className="lb-stats">
                <div className="lst">
                  <div className={`v num ret ${a.ret >= 0 ? "up" : "dn"}`}>{fmtPct(a.ret)}</div>
                  <div className="k">시즌 수익</div>
                </div>
                <div className="lst">
                  <div className="v num mdd">−{a.mdd.toFixed(1)}%</div>
                  <div className="k">최대 낙폭</div>
                </div>
                <div className="lst">
                  <div className="v num win">{a.win}%</div>
                  <div className="k">승률</div>
                </div>
                <div className="scorering">
                  <svg viewBox="0 0 52 52" width={52} height={52}>
                    <circle cx={26} cy={26} r={22} fill="none" stroke="var(--line)" strokeWidth={4} />
                    <circle
                      cx={26}
                      cy={26}
                      r={22}
                      fill="none"
                      stroke={a.accent}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={RING_CIRC * (1 - a.score / 100)}
                      style={{ transition: "stroke-dashoffset 1s var(--ease)" }}
                    />
                  </svg>
                  <span className="sv num">{a.score}</span>
                </div>
              </div>
            </div>
            <div className="lb-cta">
              <span className="backers num">
                <b className="bk">{a.backers.toLocaleString()}</b> 백커
              </span>
              <button
                type="button"
                className="btn primary dlg"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelegateClick(a.id);
                }}
              >
                맡기기
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
