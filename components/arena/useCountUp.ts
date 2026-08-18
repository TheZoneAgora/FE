"use client";

// design/agora-arena.html의 countTo() 포팅 — ease-out-cubic 카운트업.

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/arena/useReducedMotion";

export function useCountUp(target: number, format: (v: number) => string, duration = 800): string {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => format(target));
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      setDisplay(format(target));
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    function tick(t: number) {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(format(from + (target - from) * eased));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // target/format 변경 시에만 재실행 — duration은 상수로 취급
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}
