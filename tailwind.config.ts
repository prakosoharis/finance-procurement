import type { Config } from "tailwindcss";

// Every color below reads a CSS custom property (defined per-theme in globals.css as an
// "R G B" triplet, e.g. --teal: 0 212 245) rather than a literal hex value. That's what
// lets `setTheme()` re-skin the whole app at runtime just by swapping the `data-theme`
// attribute on <html> — every `bg-teal`, `text-muted`, `border-border/30` etc. across
// every component picks up the new palette automatically, opacity modifiers included.
function themeColor(cssVar: string) {
  return `rgb(var(--${cssVar}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: themeColor("bg"),
        bg2: themeColor("bg2"),
        bg3: themeColor("bg3"),
        surface: themeColor("surface"),
        border: themeColor("border"),
        teal: themeColor("teal"),
        gold: themeColor("gold"),
        green: themeColor("green"),
        red: themeColor("red"),
        purple: themeColor("purple"),
        text: themeColor("text"),
        muted: themeColor("muted"),
        light: themeColor("light"),
        fyCol: themeColor("fy-col"),
        blueHdr: themeColor("blue-hdr"),
        orgHdr: themeColor("org-hdr"),
        gapBg: themeColor("gap-bg"),
        gapBdr: themeColor("gap-bdr"),
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
