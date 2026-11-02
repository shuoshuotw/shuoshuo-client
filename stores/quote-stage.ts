import { create } from "zustand";
import { ApiFailure, fetchRandomQuote, type Quote } from "@/lib/api/client";

const HISTORY_LIMIT = 20;
const FILTER_KEY = "shuoshuo.filter";

export type StageStatus = "idle" | "loading" | "animating" | "error" | "empty";

type Stage = {
  current: Quote | null;
  /** Quotes before `current`, oldest first */
  history: Quote[];
  status: StageStatus;
  categories: string[];
  hydrate: (quote: Quote | null) => void;
  restoreFilter: () => void;
  next: () => Promise<void>;
  back: () => void;
  toggleCategory: (key: string) => void;
  clearCategories: () => void;
  settle: () => void;
};

// sessionStorage throws in some private windows; the filter simply does not persist there
function saveFilter(categories: string[]) {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(categories));
  } catch {}
}

function loadFilter(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

let latest = 0;

export const useQuoteStageStore = create<Stage>((set, get) => ({
  current: null,
  history: [],
  status: "idle",
  categories: [],

  hydrate: (quote) => {
    if (!get().current) set({ current: quote, status: quote ? "idle" : "error" });
  },

  restoreFilter: () => set({ categories: loadFilter() }),

  next: async () => {
    const request = ++latest;
    set({ status: "loading" });
    try {
      const quote = await fetchRandomQuote({ categories: get().categories });
      // A slower, older answer must not replace the newer one (ST-03)
      if (request !== latest) return;
      const { current, history } = get();
      set({
        current: quote,
        history: current ? [...history, current].slice(-HISTORY_LIMIT) : history,
        status: "animating",
      });
    } catch (error) {
      if (request !== latest) return;
      set({ status: error instanceof ApiFailure && error.code === "NO_QUOTE_MATCHED" ? "empty" : "error" });
    }
  },

  back: () => {
    const { history } = get();
    const previous = history.at(-1);
    if (!previous) return;
    latest += 1;
    set({ current: previous, history: history.slice(0, -1), status: "animating" });
  },

  toggleCategory: (key) => {
    const { categories } = get();
    const updated = categories.includes(key) ? categories.filter((item) => item !== key) : [...categories, key];
    saveFilter(updated);
    set({ categories: updated });
  },

  clearCategories: () => {
    saveFilter([]);
    set({ categories: [] });
  },

  settle: () => {
    if (get().status === "animating") set({ status: "idle" });
  },
}));
