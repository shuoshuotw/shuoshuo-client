import { create } from "zustand";

export type LiveCounts = { like_count: number; favorite_count: number; comment_count: number };

type LiveStats = {
  byQuote: Record<string, LiveCounts>;
  put: (quoteId: string, counts: LiveCounts) => void;
};

/** A quote's counts as the database last broadcast them (useLiveQuoteStats); absent until one changes. */
export const useLiveStats = create<LiveStats>((set) => ({
  byQuote: {},
  put: (quoteId, counts) => set((state) => ({ byQuote: { ...state.byQuote, [quoteId]: counts } })),
}));
