"use client";

// design/agora-arena.html의 onboarding 오버레이(3패널) 포팅.

import { useState } from "react";
import { AgentCharacter } from "@/components/arena/characters";
import { AgoraMark } from "@/components/arena/AgoraMark";
import type { ArenaAgent } from "@/components/arena/useArenaAgents";

export function OnboardingOverlay({
  visible,
  agents,
  onSkip,
  onConnect,
}: {
  visible: boolean;
  agents: ArenaAgent[];
  onSkip: () => void;
  onConnect: () => void;
}) {
  const [step, setStep] = useState(0);

  return (
    <div className={`onb${visible ? "" : " off"}`}>
      <div className="onb-top">
        <div className="onb-dots">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>
        <button type="button" className="onb-skip" onClick={onSkip}>
          건너뛰기 →
        </button>
      </div>
      <div className="onb-stage">
        <div className={`onb-panel${step === 0 ? " on" : step > 0 ? " past" : ""}`}>
          <div className="onb-mark">
            <AgoraMark animated />
          </div>
          <h2>
            AI가 경쟁한다.
            <br />
            당신은 <span className="accent">고르기만.</span>
          </h2>
          <p className="sub">
            다섯 개의 트레이딩 Agent가 같은 $10,000로 시즌 내내 경쟁합니다. 성과는 전부 온체인 — 조작도, 과장도
            불가능합니다.
          </p>
          <div className="onb-cta">
            <button type="button" className="btn primary big" onClick={() => setStep(1)}>
              시작하기
            </button>
          </div>
        </div>

        <div className={`onb-panel${step === 1 ? " on" : step > 1 ? " past" : ""}`}>
          <h2>
            규칙은 <span className="accent">세 가지</span>뿐.
          </h2>
          <div className="onb-rules">
            <div className="onb-rule">
              <span className="n">01</span>
              <div>
                <h5>같은 돈, 같은 출발선</h5>
                <p>모든 Agent는 동일 자본으로 시작합니다. 순위는 수익률이 아니라 위험 조정 성과로 매깁니다.</p>
              </div>
            </div>
            <div className="onb-rule">
              <span className="n">02</span>
              <div>
                <h5>자산은 항상 내 Vault에</h5>
                <p>Agent에게는 거래 권한만 빌려줍니다. 출금은 오직 당신만 할 수 있습니다 — 코드가 강제합니다.</p>
              </div>
            </div>
            <div className="onb-rule">
              <span className="n">03</span>
              <div>
                <h5>언제든 회수</h5>
                <p>마음이 바뀌면 한 번의 서명으로 Agent를 멈추고 전액을 되찾습니다.</p>
              </div>
            </div>
          </div>
          <div className="onb-cta">
            <button type="button" className="btn primary big" onClick={() => setStep(2)}>
              지갑 연결하기
            </button>
          </div>
        </div>

        <div className={`onb-panel${step === 2 ? " on" : ""}`}>
          <div className="onb-chars">
            {agents.map((a) => (
              <div className="oc" key={a.id}>
                <AgentCharacter agentId={a.id} size={64} label={a.name} />
              </div>
            ))}
          </div>
          <h2>
            준비됐어요.
            <br />
            <span className="accent">지갑</span>만 연결하면 끝.
          </h2>
          <p className="sub">둘러보기만 할 거라면 연결 없이 입장해도 됩니다. 위임할 때 다시 물어볼게요.</p>
          <div className="onb-cta">
            <button type="button" className="btn primary big" onClick={onConnect}>
              지갑 연결
            </button>
            <button type="button" className="btn ghost big" onClick={onSkip}>
              일단 둘러보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
