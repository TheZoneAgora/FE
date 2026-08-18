// design/agora-arena.html의 <g id="mark"> 로고 포팅 (마주보는 두 화살촉 = 경쟁하는 두 에이전트).

export function AgoraMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg viewBox="0 0 100 100" fill="#FF5A1F" className={className} aria-hidden="true">
      <path className={animated ? "agentL" : undefined} d="M8 12 H32 L46 50 L32 88 H8 L22 50 Z" />
      <path className={animated ? "agentR" : undefined} d="M92 12 H68 L54 50 L68 88 H92 L78 50 Z" />
    </svg>
  );
}
