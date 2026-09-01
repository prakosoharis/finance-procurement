import { create } from "zustand";
import { persist } from "zustand/middleware";

export const THEMES = [
  { id: "dark", label: "🌙 Dark Mode" },
  { id: "minimalist", label: "⚪ Minimalist" },
  { id: "glass", label: "💎 Glassmorphism" },
  { id: "skeuo", label: "📦 Skeuomorphism" },
  { id: "neo", label: "⚡ Neo-Brutalism" },
  { id: "bento", label: "🍱 Bento Box" },
  { id: "y2k", label: "💿 Y2K" },
  { id: "nature", label: "🌿 Nature Distilled" },
  { id: "kinetic", label: "✨ Kinetic Text" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

interface ThemeState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "dashboard-theme" }
  )
);
