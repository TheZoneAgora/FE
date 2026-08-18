"use client";

import { motion } from "framer-motion";
import type { AgentStatus } from "@/lib/vault/types";

const STATUS_META: Record<AgentStatus, { label: string; textClass: string; dotClass: string }> = {
  ACTIVE: { label: "운용 중", textClass: "text-positive", dotClass: "bg-positive" },
  REDUCE_ONLY: { label: "축소 전용", textClass: "text-warning", dotClass: "bg-warning" },
  PAUSED: { label: "정지됨", textClass: "text-negative", dotClass: "bg-negative" },
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold ${meta.textClass}`}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        {status === "ACTIVE" && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${meta.dotClass}`}
            animate={{ opacity: [0.9, 0.2, 0.9], scale: [1, 1.9, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden />
      </span>
      {meta.label}
    </span>
  );
}
