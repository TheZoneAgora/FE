"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight liveness signal for the prototype. Stands in for the real
 * polling subscription (5–15s) described in the plan. It emits a "tick"
 * roughly every interval so the live readout / pulse can refresh without
 * any layout thrash (consumers only animate transform/opacity).
 */
export function useLivePulse(intervalMs = 4000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
