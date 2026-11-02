import { create } from "zustand";

export type QuoteLayout = "horizontal" | "vertical";

const LAYOUT_KEY = "shuoshuo.layout";

type Ui = {
  layout: QuoteLayout;
  reducedMotion: boolean;
  setLayout: (layout: QuoteLayout) => void;
  /** Reads what the browser remembers and follows the system setting. Returns the unsubscribe. */
  connect: () => () => void;
};

export const useUiStore = create<Ui>((set) => ({
  layout: "horizontal",
  reducedMotion: false,

  setLayout: (layout) => {
    try {
      localStorage.setItem(LAYOUT_KEY, layout);
    } catch {}
    set({ layout });
  },

  connect: () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LAYOUT_KEY);
    } catch {}
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const follow = () => set({ reducedMotion: media.matches });
    set({ reducedMotion: media.matches, ...(stored === "vertical" || stored === "horizontal" ? { layout: stored } : {}) });
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  },
}));
