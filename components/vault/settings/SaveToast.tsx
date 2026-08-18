"use client";

import { AnimatePresence, motion } from "framer-motion";

export function SaveToast({
  message,
  tone = "positive",
}: {
  message: string | null;
  tone?: "positive" | "negative";
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-[13px] font-semibold shadow-lg backdrop-blur ${
            tone === "positive"
              ? "border-[#24C77A]/40 bg-[#11100F]/95 text-[#24C77A]"
              : "border-[#F04F5F]/40 bg-[#11100F]/95 text-[#F04F5F]"
          }`}
          role="status"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
