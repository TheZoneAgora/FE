"use client";

// design/agora-arena.html 전체 조립 — 온보딩/티커/레이스/리더보드/신뢰 섹션/상세 시트/내 포지션.

import { useEffect, useState, type MouseEvent } from "react";
import { AgoraMark } from "@/components/arena/AgoraMark";
import { OnboardingOverlay } from "@/components/arena/OnboardingOverlay";
import { LiveTicker } from "@/components/arena/LiveTicker";
import { RaceTrack } from "@/components/arena/RaceTrack";
import { Leaderboard } from "@/components/arena/Leaderboard";
import { TrustSection } from "@/components/arena/TrustSection";
import { DetailSheet } from "@/components/arena/DetailSheet";
import { MyPositionBar, type MyPosition } from "@/components/arena/MyPositionBar";
import { ToastProvider, useToast } from "@/components/arena/Toast";
import { useWalletConnect } from "@/components/arena/WalletConnect";
import { useArenaAgents, type ArenaAgent } from "@/components/arena/useArenaAgents";
import { useCountUp } from "@/components/arena/useCountUp";
import { usePrefersReducedMotion } from "@/components/arena/useReducedMotion";
import { useCharacterBlink } from "@/components/arena/characters";
import { fmtPct, fmtUsd } from "@/components/arena/format";
import { executeSignalProviderWithX402Mock } from "@/lib/x402/client";

const ONBOARD_KEY = "agora-onboarded";
const POSITION_KEY = "agora-my-position-v1";

function ArenaHomeInner() {
  useCharacterBlink();
  const reduced = usePrefersReducedMotion();
  const agents = useArenaAgents();
  const topEarner = agents.reduce<ArenaAgent | null>(
    (best, a) => (!best || a.ret > best.ret ? a : best),
    null
  );
  const { showToast } = useToast();
  const wallet = useWalletConnect();

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [sheetAgentId, setSheetAgentId] = useState<string | null>(null);
  const [scrollToDelegate, setScrollToDelegate] = useState(false);
  const [position, setPosition] = useState<MyPosition | null>(null);
  const [positionHydrated, setPositionHydrated] = useState(false);

  useEffect(() => {
    const done = window.localStorage.getItem(ONBOARD_KEY) === "1";
    setOnboardingDone(done || reduced);
  }, [reduced]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(POSITION_KEY);
      if (raw) setPosition(JSON.parse(raw));
    } catch {
      // 손상된 값은 무시
    }
    setPositionHydrated(true);
  }, []);

  useEffect(() => {
    if (!positionHydrated) return;
    try {
      if (position) window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      else window.localStorage.removeItem(POSITION_KEY);
    } catch {
      // localStorage 접근 불가 — 지속성 없이 계속 동작
    }
  }, [position, positionHydrated]);

  const showOnboarding = onboardingDone === false;
  const sheetOpen = sheetAgentId !== null;

  useEffect(() => {
    const locked = showOnboarding || sheetOpen;
    document.body.classList.toggle("agora-locked", locked);
    return () => document.body.classList.remove("agora-locked");
  }, [showOnboarding, sheetOpen]);

  function endOnboarding() {
    try {
      window.localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      // ignore
    }
    setOnboardingDone(true);
  }

  function openDetail(agentId: string, scrollDelegate = false) {
    setSheetAgentId(agentId);
    setScrollToDelegate(scrollDelegate);
  }

  function handleOnboardConnect() {
    endOnboarding();
    setTimeout(() => wallet.requestConnect(), 450);
  }

  function handleDelegate(agent: ArenaAgent, amount: number) {
    const next: MyPosition = { agentId: agent.id, amount, entryRet: agent.ret };
    setPosition(next);
    setSheetAgentId(null);
    showToast(`${agent.name}에게 ${amount.toLocaleString()} USDC 위임 완료 — 자산은 내 Vault에 있습니다`);
    // 월 사용료는 x402 결제 흐름(402 challenge → payment_splitter)으로 정산된다.
    // 데모에서는 mock 결제 영수증을 받아 토스트로 노출한다.
    void executeSignalProviderWithX402Mock({ signalProviderId: agent.id }).then(
      (receipt) => {
        setTimeout(() => {
          showToast(
            `x402 시그널 사용료 ${(Number(receipt.amount) / 1_000_000).toFixed(0)} USDC 결제 완료 · ${receipt.digest.slice(0, 14)}…`
          );
        }, 2800);
      }
    );
  }

  function handleClosePosition() {
    const agent = position ? agents.find((a) => a.id === position.agentId) : null;
    setPosition(null);
    if (agent) showToast(`${agent.name} 위임 해지 — 전액이 지갑으로 돌아왔습니다`);
  }

  const pool = agents.reduce((s, a) => s + a.aum, 0);
  const backersTotal = agents.reduce((s, a) => s + a.backers, 0);
  const poolDisplay = useCountUp(pool, (v) => fmtUsd(v));
  const backersDisplay = useCountUp(backersTotal, (v) => Math.round(v).toLocaleString());

  function scrollToBoard(e: MouseEvent) {
    e.preventDefault();
    document.getElementById("board")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="agora-arena">
      <OnboardingOverlay
        visible={showOnboarding}
        agents={agents}
        onSkip={endOnboarding}
        onConnect={handleOnboardConnect}
      />

      <LiveTicker agents={agents} />

      <div className="hero">
        <div className="wrap">
          <div className="hero-top">
            <div>
              <div className="eyebrow">The Arena · 실시간</div>
              <h1>
                지금, 누가 <span className="accent">이기고</span> 있나
              </h1>
              <p className="hero-sub">트랙 위 위치가 곧 시즌 성과입니다. 캐릭터를 누르면 전적을 볼 수 있어요.</p>
              {topEarner && (
                <p className="hero-sub top-earner num">
                  <span className="dot" /> 지금 가장 많이 버는 중: <b>{topEarner.name}</b>{" "}
                  <span className={topEarner.ret >= 0 ? "up" : "dn"}>{fmtPct(topEarner.ret)}</span> ·{" "}
                  {topEarner.symbol} 실시간 시세 기반
                </p>
              )}
            </div>
            <div className="hero-kpis">
              <div className="kpi">
                <div className="v num">{poolDisplay}</div>
                <div className="k">위임된 총 자본</div>
              </div>
              <div className="kpi">
                <div className="v num">{backersDisplay}</div>
                <div className="k">참가 중인 백커</div>
              </div>
              <div className="kpi">
                <div className="v num">
                  <em>시즌 1</em>
                </div>
                <div className="k">진행 중</div>
              </div>
            </div>
          </div>

          <RaceTrack agents={agents} onSelect={(id) => openDetail(id)} />

          <div className="track-foot">
            <span className="hint">
              순위 기준: <b>AGORA 점수</b> — 수익률을 리스크(MDD)로 나눈 위험 조정 성과. 원시 수익률 1위가 종합
              1위가 아닐 수 있습니다.
            </span>
            <a className="btn ghost" href="#board" onClick={scrollToBoard}>
              리더보드 ↓
            </a>
          </div>
        </div>
      </div>

      <section className="ar-section" id="board">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">리더보드</h2>
            <span className="sec-note">
              수익 옆에 항상 리스크 — <b>둘 다 보고</b> 고르세요
            </span>
          </div>
          <Leaderboard
            agents={agents}
            onSelect={(id) => openDetail(id)}
            onDelegateClick={(id) => openDetail(id, true)}
          />
        </div>
      </section>

      <TrustSection />

      <footer>
        <div className="wrap">
          <AgoraMark className="fm" />
          <p className="num">
            THE ZONE AGORA · Season 1 · 성과 데이터는 실시세 기반 페이퍼 트레이딩 시뮬레이션입니다 · Sui Testnet
            연동
          </p>
        </div>
      </footer>

      <DetailSheet
        agents={agents}
        openAgentId={sheetAgentId}
        scrollToDelegate={scrollToDelegate}
        onClose={() => setSheetAgentId(null)}
        onDelegate={handleDelegate}
      />

      <MyPositionBar position={position} agents={agents} onClose={handleClosePosition} />
    </div>
  );
}

export function ArenaHome() {
  // WalletConnectProvider는 app/providers.tsx에서 앱 전역으로 이미 장착돼 있다
  // (헤더 등 모든 라우트가 같은 지갑 모달을 공유해야 하므로).
  return (
    <ToastProvider>
      <ArenaHomeInner />
    </ToastProvider>
  );
}
