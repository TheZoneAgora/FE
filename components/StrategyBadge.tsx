import type { StrategyType } from "@/lib/types/domain";
import { STRATEGY_META } from "@/lib/strategyMeta";

export function StrategyBadge({
  type,
  size = "md",
}: {
  type: StrategyType;
  size?: "sm" | "md";
}) {
  const m = STRATEGY_META[type];
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider ${pad}`}
      style={{
        color: m.color,
        background: `${m.color}14`,
        border: `1px solid ${m.color}33`,
      }}
    >
      <span aria-hidden style={{ fontSize: size === "sm" ? 9 : 11 }}>
        {m.glyph}
      </span>
      {m.label}
    </span>
  );
}

export function LiveBadge({ stale }: { stale?: boolean }) {
  if (stale) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        Stale
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-good/40 bg-good/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-good">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-good" />
      </span>
      Live
    </span>
  );
}
