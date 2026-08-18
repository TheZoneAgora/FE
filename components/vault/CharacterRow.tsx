"use client";

import { AgentCharacter, useCharacterBlink } from "@/components/arena/characters";

/** design/agora-arena.html의 #onbChars(5종 캐릭터 나란히 bob) 레퍼런스. */
const CHARACTER_IDS = ["mint", "delphi", "zephyr", "atlas", "axiom"];

export function CharacterRow({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  useCharacterBlink();
  return (
    <div className={`flex items-end gap-1.5 ${className}`} aria-hidden>
      {CHARACTER_IDS.map((id, i) => (
        <span
          key={id}
          className="agora-row-bob inline-flex"
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          <AgentCharacter agentId={id} size={size} bob={false} />
        </span>
      ))}
      <style jsx>{`
        .agora-row-bob {
          animation: agora-row-bob 2.4s ease-in-out infinite;
        }
        @keyframes agora-row-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
