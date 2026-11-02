"use client";

import { Bookmark, Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasSessionCookie } from "@/lib/api/browser";
import type { Quote } from "@/lib/api/client";
import { fetchQuoteState, isSignedIn, sendReaction } from "@/lib/api/reactions";
import { notify } from "@/lib/toast";
import { burstLike, pressFavorite } from "@/motion/anime";
import { type ReactionKind, useReactionStore } from "@/stores/reactions";

/** Seeds the counts from the quote and, for a signed-in reader, their own state: the cached HTML cannot hold it (CD-03). */
export function useQuoteReactions(quote: Quote | null) {
  const id = quote?.id;
  const stats = quote?.stats;

  useEffect(() => {
    if (!id || !stats) return;
    useReactionStore.getState().seed(id, { like_count: stats.like_count, favorite_count: stats.favorite_count });
    if (!hasSessionCookie()) return;
    void fetchQuoteState(id)
      .then((state) => {
        if (state) useReactionStore.getState().merge(id, state);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per quote; the store keeps the counts from then on
  }, [id]);
}

export function ReactionButtons({ quote, disabled = false }: { quote: Quote | null; disabled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const reaction = useReactionStore((state) => (quote ? state.byQuote[quote.id] : undefined));
  // The cached HTML already knows the counts; the store only takes over after hydration
  const likes = reaction?.like_count ?? quote?.stats.like_count ?? 0;
  const favorites = reaction?.favorite_count ?? quote?.stats.favorite_count ?? 0;

  const react = async (kind: ReactionKind, button: HTMLButtonElement) => {
    if (!quote) return;
    if (!(await isSignedIn())) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const icon = button.querySelector("svg");
    const active = kind === "like" ? reaction?.liked : reaction?.favorited;
    if (icon && !active) void (kind === "like" ? burstLike(button, icon) : pressFavorite(icon));
    useReactionStore.getState().toggle(quote.id, kind, sendReaction, () => void notify("操作沒有成功，請再試一次"));
  };

  return (
    <>
      <button
        type="button"
        className="tool tool-count"
        data-active={reaction?.liked ?? false}
        aria-pressed={reaction?.liked ?? false}
        aria-label={`按讚，目前 ${likes} 個`}
        disabled={disabled}
        onClick={(event) => void react("like", event.currentTarget)}
      >
        <Heart aria-hidden="true" />
        <span className="count" key={likes}>
          {likes}
        </span>
      </button>
      <button
        type="button"
        className="tool tool-count"
        data-active={reaction?.favorited ?? false}
        aria-pressed={reaction?.favorited ?? false}
        aria-label={`收藏，目前 ${favorites} 個`}
        disabled={disabled}
        onClick={(event) => void react("favorite", event.currentTarget)}
      >
        <Bookmark aria-hidden="true" />
        <span className="count" key={favorites}>
          {favorites}
        </span>
      </button>
    </>
  );
}
