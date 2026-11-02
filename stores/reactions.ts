import { create } from "zustand";

export type ReactionKind = "like" | "favorite";

export type ReactionState = {
  liked: boolean;
  favorited: boolean;
  like_count: number;
  favorite_count: number;
  pending: boolean;
};

type Result = { active: boolean; count: number };
/** Sends the wanted state. Injected so the store has no idea about auth or transport. */
export type SendReaction = (quoteId: string, kind: ReactionKind, active: boolean) => Promise<Result>;

type Reactions = {
  byQuote: Record<string, ReactionState>;
  seed: (quoteId: string, state: Partial<ReactionState>) => void;
  toggle: (quoteId: string, kind: ReactionKind, send: SendReaction, onFail: () => void) => void;
};

const empty: ReactionState = { liked: false, favorited: false, like_count: 0, favorite_count: 0, pending: false };

const fields = (kind: ReactionKind) =>
  kind === "like" ? ({ active: "liked", count: "like_count" } as const) : ({ active: "favorited", count: "favorite_count" } as const);

// Per quote and kind: the state the user last asked for, and whether a request is out
const flights = new Map<string, { wanted: boolean; running: boolean }>();

export const useReactionStore = create<Reactions>((set, get) => {
  const patch = (quoteId: string, change: Partial<ReactionState>) =>
    set((state) => ({ byQuote: { ...state.byQuote, [quoteId]: { ...empty, ...state.byQuote[quoteId], ...change } } }));

  // Only ever sends the latest intent: quick taps collapse into at most one more request (ST-02)
  const flush = async (quoteId: string, kind: ReactionKind, send: SendReaction, onFail: () => void, confirmed: { active: boolean; count: number }) => {
    const key = `${quoteId}:${kind}`;
    const flight = flights.get(key);
    if (!flight || flight.running) return;
    flight.running = true;
    patch(quoteId, { pending: true });
    const { active, count } = fields(kind);
    let last = confirmed;
    try {
      while (flight.wanted !== last.active) {
        last = await send(quoteId, kind, flight.wanted);
      }
      patch(quoteId, { [active]: last.active, [count]: last.count, pending: false });
    } catch {
      // Back to what the server last confirmed (ST-01)
      patch(quoteId, { [active]: last.active, [count]: last.count, pending: false });
      onFail();
    } finally {
      flights.delete(key);
    }
  };

  return {
    byQuote: {},

    seed: (quoteId, state) => {
      if (!get().byQuote[quoteId]) patch(quoteId, state);
    },

    toggle: (quoteId, kind, send, onFail) => {
      const current = { ...empty, ...get().byQuote[quoteId] };
      const { active, count } = fields(kind);
      const wanted = !current[active];
      const confirmed = { active: current[active], count: current[count] };
      patch(quoteId, { [active]: wanted, [count]: Math.max(0, current[count] + (wanted ? 1 : -1)) });

      const key = `${quoteId}:${kind}`;
      const flight = flights.get(key);
      if (flight) {
        flight.wanted = wanted;
        return;
      }
      flights.set(key, { wanted, running: false });
      void flush(quoteId, kind, send, onFail, confirmed);
    },
  };
});
