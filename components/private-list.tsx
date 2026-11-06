"use client";

import { Lock } from "lucide-react";
import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { MyReactions } from "./my-reactions";
import { RowsSkeleton } from "./quote-list";
import { StateNote } from "./state-note";

/**
 * PV-03: a list kept private says so on the public page. Its owner, signed in, sees the list itself there: the page is
 * cached for everyone alike, so it is fetched here in the browser from the owner's own endpoint. Until the browser knows
 * who is reading, the rows' skeleton stands in, so the owner never sees the note flash before their own list.
 */
export function PrivateList({ username, kind }: { username: string; kind: "favorite" | "like" }) {
  const { me, status } = useSessionStore();
  useEffect(() => {
    void useSessionStore.getState().load();
  }, []);
  if (status === "idle" || status === "loading") return <RowsSkeleton />;
  if (me && me.username.toLowerCase() === username.toLowerCase()) return <MyReactions kind={kind} titled={false} />;
  return <StateNote title="此清單已設為私人" icon={Lock} large />;
}
