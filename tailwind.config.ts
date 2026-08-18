import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reference palette
        bg: "#0b0f19",
        bgDeep: "#070a12",
        panel: "#111827",
        panel2: "#141b2d",
        line: "#273247",
        ink: "#e5e7eb",
        muted: "#a8b3cf",
        accent: "#8b5cf6", // violet
        accent2: "#06b6d4", // cyan
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444",

        // THE ZONE AGORA brand system (design/design.md) — used by vault UI + app shell.
        "agora-orange": "#FF5A1F",
        "arena-black": "#11100F",
        "warm-ivory": "#FFF8ED",
        "surface-dark": "#1B1917",
        "surface-light": "#F4EDE3",
        "muted-dark": "#8D857B",
        "muted-light": "#B9B0A5",
        positive: "#24C77A",
        negative: "#F04F5F",
        warning: "#F6B73C",
        "neutral-data": "#7F8A99",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "20px",
        xl3: "28px",
      },
      boxShadow: {
        glass: "0 12px 34px rgba(0,0,0,0.28)",
        hero: "0 25px 80px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(139,92,246,0.18), 0 0 40px rgba(139,92,246,0.18)",
        glowCyan: "0 0 0 1px rgba(6,182,212,0.18), 0 0 40px rgba(6,182,212,0.16)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s ease-in-out infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
