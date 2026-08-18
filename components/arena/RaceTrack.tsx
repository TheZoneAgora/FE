"use client";

// design/agora-arena.html의 renderRace() 포팅 — 레인 5개, 위치는 수익률을 16%~82%로 정규화.

import { useEffect, useRef, useState } from "react";
import { AgentCharacter } from "@/components/arena/characters";
import { fmtPct } from "@/components/arena/format";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

export function RaceTrack({
  agents,
  onSelect,
}: {
  agents: ArenaAgent[];
  onSelect: (agentId: string) => void;
}) {
  const ranked = [...agents].sort((a, b) => b.score - a.score);
  const rets = agents.map((a) => a.ret);
  const min = Math.min(...rets);
  const max = Math.max(...rets);
  const span = max - min || 1;

  const prevRet = useRef<Record<string, number>>({});
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const changed: string[] = [];
    for (const a of agents) {
      if (prevRet.current[a.id] !== undefined && prevRet.current[a.id] !== a.ret) {
        changed.push(a.id);
      }
      prevRet.current[a.id] = a.ret;
    }
    if (changed.length === 0) return;
    setRunningIds((prev) => {
      const next = new Set(prev);
      changed.forEach((id) => next.add(id));
      return next;
    });
    const t = setTimeout(() => {
      setRunningIds((prev) => {
        const next = new Set(prev);
        changed.forEach((id) => next.delete(id));
        return next;
      });
    }, 1700);
    return () => clearTimeout(t);
  }, [agents]);

  return (
    <div className="track" id="track">
      <div className="finish" />
      <div className="finish-label">FINISH</div>
      {agents.map((a) => {
        const rank = ranked.indexOf(a) + 1;
        const pos = 16 + ((a.ret - min) / span) * 66;
        const running = runningIds.has(a.id);
        return (
          <div className={`lane${rank === 1 ? " leadlane" : ""}`} key={a.id}>
            <div className="lane-glow" />
            <button
              type="button"
              className={`racer${running ? " running" : ""}${rank === 1 ? " lead" : ""}`}
              style={{ left: `${pos}%` }}
              aria-label={`${a.name} 상세 보기`}
              onClick={() => onSelect(a.id)}
            >
              <div className="char">
                <AgentCharacter agentId={a.id} size={58} running={running} label={a.name} />
                <span className="rankbadge num">{rank}</span>
                <span className="speed">
                  <span />
                  <span />
                </span>
              </div>
              <span className="nm">{a.name}</span>
              <span className={`rt num ${a.ret >= 0 ? "up" : "dn"}`}>{fmtPct(a.ret)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
