import { create } from "zustand";
import { api, hasSessionCookie } from "@/lib/api/browser";
import { ApiFailure, type Me } from "@/lib/api/client";

type SessionStatus = "idle" | "loading" | "anonymous" | "ready" | "error";

type Session = {
  status: SessionStatus;
  me: Me | null;
  load: (force?: boolean) => Promise<void>;
  setMe: (me: Me) => void;
};

function anonymous() {
  // theme.js guessed from the cookie before paint, so the header takes the guess back
  document.documentElement.classList.remove("signed-in");
  return { status: "anonymous", me: null } as const;
}

/** The signed-in user, shared by the header and every page behind it. */
export const useSessionStore = create<Session>((set, get) => ({
  status: "idle",
  me: null,

  load: async (force = false) => {
    const { status } = get();
    if (!force && (status === "loading" || status === "ready" || status === "anonymous")) return;
    if (!hasSessionCookie()) {
      set(anonymous());
      return;
    }
    set({ status: "loading" });
    try {
      set({ status: "ready", me: await api<Me>("/v1/me") });
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 401) set(anonymous());
      else set({ status: "error" });
    }
  },

  setMe: (me) => set({ status: "ready", me }),
}));
