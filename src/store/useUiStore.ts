import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface UiState {
  toasts: Toast[];
  pushToast: (message: string, variant?: Toast["variant"]) => void;
  dismissToast: (id: string) => void;
  isUploadOpen: boolean;
  setUploadOpen: (v: boolean) => void;
  /** Set by "Ask AI to Elaborate" buttons; the AI Assistant page consumes and clears it on mount. */
  pendingAiPrompt: string | null;
  setPendingAiPrompt: (p: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (message, variant = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: crypto.randomUUID(), message, variant }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  isUploadOpen: false,
  setUploadOpen: (v) => set({ isUploadOpen: v }),
  pendingAiPrompt: null,
  setPendingAiPrompt: (pendingAiPrompt) => set({ pendingAiPrompt }),
}));
