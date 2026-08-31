import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f15",
        bg2: "#111722",
        bg3: "#161e2d",
        surface: "#1c2639",
        border: "#253348",
        teal: "#00d4f5",
        gold: "#f5a623",
        green: "#3ddc84",
        red: "#ff4d6d",
        purple: "#a78bfa",
        text: "#dde6f0",
        muted: "#5e7a98",
        light: "#8ba8c4",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
