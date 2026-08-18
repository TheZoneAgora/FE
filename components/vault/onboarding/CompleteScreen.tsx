"use client";

import { motion } from "framer-motion";

export function CompleteScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-5 rounded-[24px] border border-white/10 bg-surface-dark px-8 py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-positive bg-positive/15"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#24C77A"
          strokeWidth="2.5"
          strokeLinecap="square"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <h1 className="font-display text-xl font-bold tracking-tight text-warm-ivory">
        볼트가 생성되었습니다
      </h1>
      <p className="text-[14px] text-muted-light">내 볼트로 이동합니다...</p>
    </motion.div>
  );
}
