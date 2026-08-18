const STEPS = [
  { id: 1, label: "지갑 연결" },
  { id: 2, label: "예치" },
  { id: 3, label: "확인" },
] as const;

export function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="mb-10 flex items-center">
      {STEPS.map((s) => {
        const state =
          s.id < step ? "done" : s.id === step ? "current" : "upcoming";

        return (
          <li key={s.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-[13px] font-semibold transition-colors duration-200 ${
                  state === "current"
                    ? "bg-agora-orange text-arena-black"
                    : state === "done"
                      ? "bg-warm-ivory text-arena-black"
                      : "border border-white/15 text-muted-light"
                }`}
              >
                {state === "done" ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="square"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
              <span
                className={`text-[11px] font-medium uppercase tracking-[0.08em] ${
                  state === "upcoming" ? "text-muted-light" : "text-warm-ivory"
                }`}
              >
                {s.label}
              </span>
            </div>
            {s.id !== STEPS.length && (
              <div
                className={`mx-3 h-px flex-1 transition-colors duration-200 ${
                  state === "done" ? "bg-warm-ivory/30" : "bg-white/10"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
