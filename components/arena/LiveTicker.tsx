"use client";

// design/agora-arena.html의 pushTicker()/randomTickerEvent() 포팅.
// 엔진의 실제 체결/리젝 이벤트 + 그럴듯한 목업 위임 이벤트를 섞어서 흘려보낸다.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getLiveStrategyEngine } from "@/lib/live/LiveStrategyEngine";
import type { ActivityEvent } from "@/lib/live/types";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function eventLine(ev: ActivityEvent, agentName: string): ReactNode | null {
  switch (ev.type) {
    case "ORDER_EXECUTED":
      return (
        <>
          <b>{agentName}</b>&nbsp;체결&nbsp;
          <span className={ev.side === "BUY" ? "up" : "dn"}>{ev.side === "BUY" ? "매수" : "매도"}</span>
          &nbsp;{ev.symbol} @ ${ev.fillPrice.toFixed(2)}
        </>
      );
    case "SIGNAL_REJECTED":
      return (
        <>
          <b>{agentName}</b>&nbsp;신호 리젝&nbsp;· {ev.reason}
        </>
      );
    default:
      return null;
  }
}

function randomMockLine(agents: ArenaAgent[]): ReactNode {
  const ranked = [...agents].sort((a, b) => b.score - a.score);
  const a = agents[Math.floor(rand(0, agents.length))];
  const kind = Math.random();
  const addr = "0x" + Math.random().toString(16).slice(2, 6) + "…" + Math.random().toString(16).slice(2, 6);
  if (kind < 0.55) {
    const amt = [100, 250, 500, 1000, 2000][Math.floor(rand(0, 5))];
    return (
      <>
        <b>{addr}</b>&nbsp;님이&nbsp;<b>{a.name}</b>에게&nbsp;
        <span className="up">{amt.toLocaleString()} USDC</span>&nbsp;위임
      </>
    );
  }
  if (kind < 0.8) {
    return (
      <>
        <b>{ranked[0].name}</b>&nbsp;이(가) 1위 수성 중&nbsp;· AGORA 점수&nbsp;<b>{ranked[0].score}</b>
      </>
    );
  }
  return (
    <>
      시즌 1 진행 중&nbsp;·&nbsp;<b>5개 Agent</b>가 같은&nbsp;<b>$10,000</b>로 경쟁하고 있습니다
    </>
  );
}

interface TickerItem {
  id: number;
  content: ReactNode;
  phase: "base" | "in" | "out";
}

let idCounter = 0;

export function LiveTicker({ agents }: { agents: ArenaAgent[] }) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  const push = useRef((content: ReactNode) => {
    const id = ++idCounter;
    setItems((prev) => [
      ...prev.map((it) => (it.phase === "in" ? { ...it, phase: "out" as const } : it)),
      { id, content, phase: "base" as const },
    ]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, phase: "in" as const } : it)));
      });
    });
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.phase !== "out"));
    }, 650);
  });

  useEffect(() => {
    push.current(
      <>
        시즌 1 진행 중&nbsp;— <b>5개 Agent</b>가 같은&nbsp;<b>$10,000</b>로 경쟁하고 있습니다
      </>
    );

    const engine = getLiveStrategyEngine();
    const unsubscribe = engine.subscribe((tick) => {
      for (const ev of tick.events) {
        const agent = agentsRef.current.find((a) => a.id === ev.agentId);
        const line = eventLine(ev, agent?.name ?? ev.agentId.toUpperCase());
        if (line) push.current(line);
      }
    });

    const mockTimer = setInterval(() => {
      if (agentsRef.current.length > 0) push.current(randomMockLine(agentsRef.current));
    }, 4200);

    return () => {
      unsubscribe();
      clearInterval(mockTimer);
    };
  }, []);

  return (
    <div className="ticker">
      <div className="wrap">
        <span className="tk-label">
          <i /> LIVE
        </span>
        <div className="tk-stage" id="tkStage">
          {items.map((it) => (
            <div key={it.id} className={`tk-item${it.phase === "base" ? "" : ` ${it.phase}`}`}>
              {it.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
