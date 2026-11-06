"use client";

import { Bookmark, EyeOff, Heart, Quote } from "lucide-react";
import type { FavoriteItem, LikeItem } from "@/lib/api/client";
import { usePagedList } from "@/lib/use-paged-list";
import { LinkButton } from "./link-button";
import { ListFooter } from "./list-footer";
import { RowsSkeleton, useRowsEnter } from "./quote-list";
import { QuoteRow } from "./quote-row";
import { useListReactions } from "./reaction-buttons";
import { Reveal } from "./reveal";
import { PageHead } from "./site-chrome";
import { RetryNote, StateNote } from "./state-note";

const COPY = {
  favorite: { title: "我的收藏", icon: Bookmark, path: "/v1/me/favorites?limit=20", empty: "你還沒有收藏任何說說" },
  like: { title: "我的按讚", icon: Heart, path: "/v1/me/likes?limit=20", empty: "你還沒有按讚任何說說" },
} as const;

type Item = (FavoriteItem | LikeItem) & { favorited_at?: string; liked_at?: string };

/**
 * The reader's likes or favourites. Each card carries that reaction itself, so it is taken back (and given again) on the
 * card; the card stays until the list is next loaded, so a slip of the finger is one tap to undo.
 */
export function MyReactions({ kind, titled = true }: { kind: "favorite" | "like"; titled?: boolean }) {
  const copy = COPY[kind];
  const { items, status, hasMore, loadMore, reload } = usePagedList<Item>(copy.path);
  const list = useRowsEnter(status === "loading" ? 0 : items.length);
  useListReactions(items.flatMap((item) => (item.quote ? [item.quote] : [])));

  return (
    <>
      {titled && <PageHead icon={copy.icon} title={copy.title} />}
      <Reveal loading={status === "loading"} skeleton={<RowsSkeleton />}>
        {status === "error" && items.length === 0 ? (
          <RetryNote title="列表沒有載入成功" onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          <StateNote title={copy.empty} icon={copy.icon}>
            <LinkButton href="/quotes" color="primary" radius="full" data-magnet startContent={<Quote aria-hidden="true" size={18} />}>
              去看看說說
            </LinkButton>
          </StateNote>
        ) : (
          <div className="rows" ref={list}>
            {items.map((item, index) =>
              item.quote ? (
                <QuoteRow key={item.quote.id} quote={item.quote} reaction={kind} />
              ) : (
                // §8.7.3: the quote has since been removed or deleted
                <div className="quote-row-item" key={index}>
                  <div className="quote-card quote-card-gone">
                    <EyeOff aria-hidden="true" size={20} />
                    <p>這則說說已無法顯示。</p>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </Reveal>
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}
