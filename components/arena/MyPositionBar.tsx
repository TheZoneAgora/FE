"use client";

// design/agora-arena.html의 #mypos 바 포팅 — localStorage에 지속되는 내 위임 포지션.

import { AgentCharacter } from "@/components/arena/characters";
import { fmtPct } from "@/components/arena/format";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

export interface MyPosition {
  agentId: string;
  amount: number;
  entryRet: number;
}

export function MyPositionBar({
  position,
  agents,
  onClose,
}: {
  position: MyPosition | null;
  agents: ArenaAgent[];
  onClose: () => void;
}) {
  const agent = position ? agents.find((a) => a.id === position.agentId) ?? null : null;
  const on = !!position && !!agent;
  const d = agent && position ? agent.ret - position.entryRet : 0;
  const usd = position ? (position.amount * d) / 100 : 0;

  return (
    <div className={`mypos${on ? " on" : ""}`}>
      {agent && position && (
        <>
          <div className="pc">
            <AgentCharacter agentId={agent.id} size={44} label={agent.name} />
          </div>
          <div className="pi">
            <div className="pn">
              {agent.name}{" "}
              <span className={`tag${agent.real ? " real" : ""}`}>{agent.real ? "REAL" : "SIM"}</span>
            </div>
            <div className="pk num">{position.amount.toLocaleString()} USDC 위임 중 · 내 Vault</div>
          </div>
          <div className="pv">
            <div className={`pnl num ${d >= 0 ? "up" : "dn"}`}>{fmtPct(d, 2)}</div>
            <div className="pw num">
              {usd >= 0 ? "+" : "−"}${Math.abs(usd).toFixed(2)}
            </div>
          </div>
          <button type="button" className="px" aria-label="포지션 회수" onClick={onClose}>
            ✕
          </button>
        </>
      )}
    </div>
  );
}
