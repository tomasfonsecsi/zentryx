import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          app: "#03060e",
          card: "rgba(8,14,30,0.6)",
          "card-solid": "#080e1e",
          "card-hover": "rgba(14,24,48,0.7)",
          input: "rgba(4,8,18,0.9)",
          nav: "rgba(3,6,14,0.94)",
        },
        accent: {
          DEFAULT: "#3b9eff",
          hover: "#62b3ff",
          muted: "#2a7ad4",
          dim: "rgba(59,158,255,0.1)",
          strong: "rgba(59,158,255,0.22)",
        },
        status: {
          green: "#10b981", "green-text": "#34d399", "green-bg": "rgba(16,185,129,0.08)",
          amber: "#f59e0b", "amber-text": "#fbbf24", "amber-bg": "rgba(245,158,11,0.08)",
          red: "#ef4444", "red-text": "#f87171", "red-bg": "rgba(239,68,68,0.08)",
        },
        txt: { 1: "#e8ecf4", 2: "#7a8ba6", 3: "#3e4f68" },
        border: {
          subtle: "rgba(255,255,255,0.04)",
          hover: "rgba(255,255,255,0.08)",
          accent: "rgba(59,158,255,0.18)",
          glow: "rgba(59,158,255,0.12)",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { card: "16px", btn: "12px", xs: "6px" },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59,158,255,0.3)" },
          "50%": { boxShadow: "0 0 0 7px rgba(59,158,255,0)" },
        },
        "fade-in": { from: { opacity: "0", transform: "translateY(-4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s ease infinite",
        "fade-in": "fade-in 0.2s ease",
        "fade-up": "fade-up 0.35s ease forwards",
      },
    },
  },
  plugins: [],
};
export default config;
