"use client";

import { Button } from "@heroui/react";
import { Bookmark, Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, hasSessionCookie } from "@/lib/api/browser";
import type { Quote } from "@/lib/api/client";
import { fetchQuoteState, isSignedIn, sendReaction } from "@/lib/api/reactions";
import { notify } from "@/lib/toast";
import { favoriteMotion, likeMotion } from "@/motion/anime";
import { type ReactionKind, useReactionStore } from "@/stores/reactions";
import { Digits } from "./digits";

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

// The quotes whose own state this page has already asked for
const asked = new Set<string>();

/** The same for a page of quotes, with the reader's own states asked for in one request per page loaded. */
export function useListReactions(quotes: Pick<Quote, "id" | "stats">[]) {
  const ids = quotes.map(({ id }) => id).join(",");
  useEffect(() => {
    const { seed, merge } = useReactionStore.getState();
    for (const { id, stats } of quotes) seed(id, { like_count: stats.like_count, favorite_count: stats.favorite_count });
    const unknown = quotes.map(({ id }) => id).filter((id) => !asked.has(id));
    if (!hasSessionCookie() || unknown.length === 0) return;
    for (const id of unknown) asked.add(id);
    void api<{ states: Record<string, { liked: boolean; favorited: boolean }> }>(`/v1/me/quote-states?ids=${unknown.join(",")}`)
      .then(({ states }) => {
        for (const [id, state] of Object.entries(states)) merge(id, state);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the ids; the store keeps the counts from then on
  }, [ids]);
}

const KINDS = {
  like: { icon: Heart, label: "按讚", active: "liked", count: "like_count", stat: "like_count" },
  favorite: { icon: Bookmark, label: "收藏", active: "favorited", count: "favorite_count", stat: "favorite_count" },
} as const;

/** A like or a favourite, with its count and its own move each way (M-06, M-07). */
export function ReactionButton({ quote, kind, disabled = false, size = "md" }: { quote: Quote | null; kind: ReactionKind; disabled?: boolean; size?: "sm" | "md" }) {
  const router = useRouter();
  const pathname = usePathname();
  const reaction = useReactionStore((state) => (quote ? state.byQuote[quote.id] : undefined));
  const { icon: Icon, label, active: activeField, count: countField, stat } = KINDS[kind];
  // The cached HTML already knows the counts; the store only takes over after hydration
  const count = reaction?.[countField] ?? quote?.stats[stat] ?? 0;
  const active = reaction?.[activeField] ?? false;

  const react = async (button: HTMLElement) => {
    if (!quote) return;
    if (!(await isSignedIn())) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const icon = button.querySelector(".react-icon");
    // Both ways have their own move: taking a like or a favourite back is a change as well
    if (icon) void (kind === "like" ? likeMotion(icon, !active) : favoriteMotion(icon, !active));
    // A row rendered on the server was never seeded; the toggle counts from the quote's own numbers then
    useReactionStore.getState().seed(quote.id, { like_count: quote.stats.like_count, favorite_count: quote.stats.favorite_count });
    useReactionStore.getState().toggle(quote.id, kind, sendReaction, () => void notify("操作沒有成功，請再試一次", "failed"));
  };

  const iconSize = size === "sm" ? 16 : 18;
  return (
    <Button
      radius="full"
      variant="light"
      size={size}
      className="tool-count"
      data-kind={kind}
      data-magnet
      data-active={active}
      aria-pressed={active}
      aria-label={`${label}，目前 ${count} 個`}
      isDisabled={disabled}
      startContent={
        <span className="react-icon" aria-hidden="true">
          <Icon className="react-outline" size={iconSize} />
          <Icon className="react-fill" size={iconSize} />
        </span>
      }
      onPress={(event) => void react(event.target as HTMLElement)}
    >
      <span className="count">
        <Digits value={count} />
      </span>
    </Button>
  );
}

export function ReactionButtons({ quote, disabled = false }: { quote: Quote | null; disabled?: boolean }) {
  return (
    <>
      <ReactionButton quote={quote} kind="like" disabled={disabled} />
      <ReactionButton quote={quote} kind="favorite" disabled={disabled} />
    </>
  );
}
