"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { type LiveCounts, useLiveStats } from "@/stores/live-stats";
import { useReactionStore } from "@/stores/reactions";

type Broadcast = LiveCounts & { id: string };

/**
 * Every change to a quote's counts is broadcast by the database on the public Realtime topic `quote-stats`
 * (private.broadcast_quote_stats). A list subscribes while it is on screen, and the numbers it shows move to the new
 * value as it arrives. The counts are public, so the topic needs no sign-in.
 */
export function useLiveQuoteStats() {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("quote-stats")
      .on("broadcast", { event: "stats" }, ({ payload }: { payload: Record<string, unknown> }) => {
        const { id, like_count, favorite_count, comment_count } = payload as unknown as Broadcast;
        useLiveStats.getState().put(id, { like_count, favorite_count, comment_count });
        // Likes and favourites are shown from the reaction store, which leaves a reader's own change in flight alone
        useReactionStore.getState().merge(id, { like_count, favorite_count });
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, []);
}
