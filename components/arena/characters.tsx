"use client";

/**
 * design/agora-arena.html의 귀여운 에이전트 캐릭터 5종 포팅.
 * face 종류: visor(바이저 로봇) / eye(외눈) / wing(날개 육각) / block(블록 로봇) / spark(다이아).
 * 눈 깜빡임은 useCharacterBlink()가 .agora-eye 클래스를 주기적으로 스케일한다.
 */

import { useEffect } from "react";

export type CharacterFace = "visor" | "eye" | "wing" | "block" | "spark";

export interface CharacterSpec {
  face: CharacterFace;
  accent: string;
}

/** 엔진/시드 에이전트 id → 캐릭터 매핑 (원본 HTML의 배색 유지). */
export const AGENT_CHARACTERS: Record<string, CharacterSpec> = {
  mint: { face: "visor", accent: "#24C77A" }, // 실전 봇 — 초록 바이저
  delphi: { face: "eye", accent: "#F6B73C" }, // 예측시장 — 외눈 오라클
  zephyr: { face: "wing", accent: "#6BB7D6" }, // 날씨 arb — 날개
  atlas: { face: "block", accent: "#9AA6B5" }, // 매크로 — 블록
  axiom: { face: "spark", accent: "#E97FA4" }, // 모멘텀 — 다이아
};

export function characterFor(agentId: string): CharacterSpec {
  return AGENT_CHARACTERS[agentId] ?? { face: "spark", accent: "#FF5A1F" };
}

function faceSvg(face: CharacterFace, c: string): string {
  switch (face) {
    case "visor":
      return `
      <rect x="10" y="14" width="44" height="40" rx="12" fill="${c}"/>
      <rect x="16" y="24" width="32" height="13" rx="6.5" fill="#11100F"/>
      <rect class="agora-eye" x="21" y="28" width="6" height="5" rx="1.5" fill="#FFF8ED"/>
      <rect class="agora-eye" x="37" y="28" width="6" height="5" rx="1.5" fill="#FFF8ED"/>
      <path d="M32 14 V7" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="5.5" r="3" fill="${c}"/>
      <rect x="20" y="54" width="8" height="7" rx="3" fill="${c}"/>
      <rect x="36" y="54" width="8" height="7" rx="3" fill="${c}"/>`;
    case "eye":
      return `
      <circle cx="32" cy="34" r="21" fill="${c}"/>
      <circle cx="32" cy="34" r="10.5" fill="#FFF8ED"/>
      <circle class="agora-eye" cx="32" cy="34" r="5" fill="#11100F"/>
      <path d="M14 15 L19 20 M32 9 V16 M50 15 L45 20" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <rect x="21" y="53" width="8" height="7" rx="3" fill="${c}"/>
      <rect x="35" y="53" width="8" height="7" rx="3" fill="${c}"/>`;
    case "wing":
      return `
      <path d="M32 10 L52 22 V44 L32 56 L12 44 V22 Z" fill="${c}"/>
      <path d="M12 30 L2 24 L6 36 Z M52 30 L62 24 L58 36 Z" fill="${c}" opacity=".7"/>
      <circle class="agora-eye" cx="25" cy="32" r="3.4" fill="#11100F"/>
      <circle class="agora-eye" cx="39" cy="32" r="3.4" fill="#11100F"/>
      <path d="M27 42 Q32 45 37 42" stroke="#11100F" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    case "block":
      return `
      <rect x="11" y="13" width="42" height="42" rx="8" fill="${c}"/>
      <rect x="17" y="24" width="12" height="4" rx="2" fill="#11100F"/>
      <rect x="35" y="24" width="12" height="4" rx="2" fill="#11100F"/>
      <rect class="agora-eye" x="20" y="31" width="6.5" height="6.5" rx="1.6" fill="#11100F"/>
      <rect class="agora-eye" x="38" y="31" width="6.5" height="6.5" rx="1.6" fill="#11100F"/>
      <rect x="26" y="45" width="12" height="3.4" rx="1.7" fill="#11100F"/>
      <rect x="19" y="55" width="9" height="6" rx="3" fill="${c}"/>
      <rect x="36" y="55" width="9" height="6" rx="3" fill="${c}"/>`;
    case "spark":
      return `
      <path d="M32 6 L56 34 L32 62 L8 34 Z" fill="${c}"/>
      <path class="agora-eye" d="M23 31 l3.2 -3.2 3.2 3.2 -3.2 3.2 Z" fill="#11100F"/>
      <path class="agora-eye" d="M34.6 31 l3.2 -3.2 3.2 3.2 -3.2 3.2 Z" fill="#11100F"/>
      <path d="M27 41 Q32 44.5 37 41" stroke="#11100F" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  }
}

export function AgentCharacter({
  agentId,
  size = 58,
  running = false,
  bob = true,
  className = "",
  label,
}: {
  agentId: string;
  size?: number;
  running?: boolean;
  bob?: boolean;
  className?: string;
  label?: string;
}) {
  const spec = characterFor(agentId);
  return (
    <svg
      viewBox="0 0 64 68"
      width={size}
      height={size}
      className={className}
      style={{ overflow: "visible" }}
      aria-label={label ?? agentId}
      role="img"
    >
      <g
        className={running ? "agora-char-run" : bob ? "agora-char-bob" : undefined}
        dangerouslySetInnerHTML={{ __html: faceSvg(spec.face, spec.accent) }}
      />
    </svg>
  );
}

/** 원본 HTML의 랜덤 눈 깜빡임 — 마운트된 모든 .agora-eye에 전역 1회만 건다. */
let blinkStarted = false;
export function useCharacterBlink() {
  useEffect(() => {
    if (blinkStarted || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    blinkStarted = true;
    const timer = setInterval(() => {
      document.querySelectorAll<SVGElement>(".agora-eye").forEach((e) => {
        if (Math.random() < 0.25) {
          e.style.transition = "transform .09s";
          e.style.transformOrigin = "center";
          e.style.transformBox = "fill-box";
          e.style.transform = "scaleY(.12)";
          setTimeout(() => {
            e.style.transform = "";
          }, 120);
        }
      });
    }, 1800);
    return () => clearInterval(timer);
  }, []);
}
