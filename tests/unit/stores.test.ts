import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiFailure, type Quote } from "@/lib/api/client";
import { useQuoteStageStore } from "@/stores/quote-stage";
import { useReactionStore } from "@/stores/reactions";

const quote = (id: string): Quote => ({ id, content: `內容${id}` }) as Quote;

function storage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

const answers: ((value: Quote | ApiFailure) => void)[] = [];

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  fetchRandomQuote: () =>
    new Promise<Quote>((resolve, reject) => {
      answers.push((value) => (value instanceof ApiFailure ? reject(value) : resolve(value)));
    }),
}));

beforeEach(() => {
  answers.length = 0;
  vi.stubGlobal("sessionStorage", storage());
  vi.stubGlobal("localStorage", storage());
  useQuoteStageStore.setState({ current: null, history: [], status: "idle", categories: [] });
  useReactionStore.setState({ byQuote: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useQuoteStageStore", () => {
  it("ST-03: drops a slower, older answer", async () => {
    const { next } = useQuoteStageStore.getState();
    const older = next();
    const newer = next();
    answers[1]!(quote("新"));
    await newer;
    answers[0]!(quote("舊"));
    await older;
    expect(useQuoteStageStore.getState().current?.id).toBe("新");
    expect(useQuoteStageStore.getState().history).toEqual([]);
  });

  it("ST-04: keeps 20 quotes of history and goes back through them", async () => {
    const { next, back } = useQuoteStageStore.getState();
    for (let i = 0; i < 23; i += 1) {
      const running = next();
      answers.at(-1)!(quote(String(i)));
      await running;
    }
    expect(useQuoteStageStore.getState().history).toHaveLength(20);
    expect(useQuoteStageStore.getState().current?.id).toBe("22");
    back();
    expect(useQuoteStageStore.getState().current?.id).toBe("21");
    expect(useQuoteStageStore.getState().history).toHaveLength(19);
  });

  it("does nothing going back with no history", () => {
    useQuoteStageStore.setState({ current: quote("a") });
    useQuoteStageStore.getState().back();
    expect(useQuoteStageStore.getState().current?.id).toBe("a");
  });

  it("tells an empty filter apart from a failure", async () => {
    const { next } = useQuoteStageStore.getState();
    let running = next();
    answers.at(-1)!(new ApiFailure(404, "NO_QUOTE_MATCHED"));
    await running;
    expect(useQuoteStageStore.getState().status).toBe("empty");
    running = next();
    answers.at(-1)!(new ApiFailure(503, "SERVICE_UNAVAILABLE"));
    await running;
    expect(useQuoteStageStore.getState().status).toBe("error");
  });

  it("ST-05: restores the filter from sessionStorage", () => {
    useQuoteStageStore.getState().toggleCategory("anime");
    useQuoteStageStore.getState().toggleCategory("game");
    useQuoteStageStore.getState().toggleCategory("anime");
    useQuoteStageStore.setState({ categories: [] });
    useQuoteStageStore.getState().restoreFilter();
    expect(useQuoteStageStore.getState().categories).toEqual(["game"]);
  });

  it("ST-05: survives storage that throws or holds garbage", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(() => useQuoteStageStore.getState().toggleCategory("anime")).not.toThrow();
    expect(() => useQuoteStageStore.getState().restoreFilter()).not.toThrow();
    expect(useQuoteStageStore.getState().categories).toEqual([]);

    vi.stubGlobal("sessionStorage", { getItem: () => "{not json", setItem: () => {} });
    useQuoteStageStore.getState().restoreFilter();
    expect(useQuoteStageStore.getState().categories).toEqual([]);
  });
});

describe("useReactionStore", () => {
  const state = (id = "q") => useReactionStore.getState().byQuote[id]!;
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  it("ST-01: counts at once, confirms from the server, and rolls back on failure", async () => {
    const { seed, toggle } = useReactionStore.getState();
    seed("q", { like_count: 5 });
    const onFail = vi.fn();

    toggle("q", "like", async () => ({ active: true, count: 9 }), onFail);
    expect(state()).toMatchObject({ liked: true, like_count: 6 });
    await flush();
    expect(state()).toMatchObject({ liked: true, like_count: 9, pending: false });
    expect(onFail).not.toHaveBeenCalled();

    toggle(
      "q",
      "like",
      async () => {
        throw new Error("down");
      },
      onFail,
    );
    expect(state()).toMatchObject({ liked: false, like_count: 8 });
    await flush();
    expect(state()).toMatchObject({ liked: true, like_count: 9, pending: false });
    expect(onFail).toHaveBeenCalledOnce();
  });

  it("ST-02: quick taps send only the final intent", async () => {
    const { seed, toggle } = useReactionStore.getState();
    seed("q", { like_count: 0 });
    const sent: boolean[] = [];
    const send = async (_id: string, _kind: "like" | "favorite", active: boolean) => {
      sent.push(active);
      await flush();
      return { active, count: active ? 1 : 0 };
    };
    for (let i = 0; i < 5; i += 1) toggle("q", "like", send, () => {});
    await flush();
    await flush();
    await flush();
    // The first request was already out; the taps behind it collapse into the one final state
    expect(sent).toEqual([true]);
    expect(state()).toMatchObject({ liked: true, like_count: 1, pending: false });
  });

  it("ST-02: sends again when the final intent differs from the request in flight", async () => {
    const { seed, toggle } = useReactionStore.getState();
    seed("q", { like_count: 0 });
    const sent: boolean[] = [];
    const send = async (_id: string, _kind: "like" | "favorite", active: boolean) => {
      sent.push(active);
      await flush();
      return { active, count: active ? 1 : 0 };
    };
    toggle("q", "like", send, () => {});
    toggle("q", "like", send, () => {});
    await flush();
    await flush();
    await flush();
    expect(sent).toEqual([true, false]);
    expect(state()).toMatchObject({ liked: false, like_count: 0 });
  });

  it("keeps likes and favorites apart", async () => {
    const { seed, toggle } = useReactionStore.getState();
    seed("q", { like_count: 1, favorite_count: 1 });
    toggle("q", "favorite", async () => ({ active: true, count: 2 }), () => {});
    await flush();
    expect(state()).toMatchObject({ favorited: true, favorite_count: 2, liked: false, like_count: 1 });
  });
});
