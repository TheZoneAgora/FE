"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import { motion } from "framer-motion";

export function ConnectStep() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-8 py-14 text-center"
    >
      <h1 className="font-display text-xl font-bold tracking-tight text-warm-ivory">
        Sui 지갑을 연결해 주세요
      </h1>
      <p className="max-w-sm text-[14px] leading-relaxed text-muted-light">
        볼트를 만들려면 먼저 지갑을 연결해야 합니다. 연결 후 자동으로 다음
        단계로 이동합니다.
      </p>
      <ConnectButton connectText="지갑 연결" />
    </motion.div>
  );
}
