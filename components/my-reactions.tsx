"use client";

import Link from "next/link";
import { failureMessage, type FavoriteItem, type LikeItem } from "@/lib/api/client";
import { sendReaction } from "@/lib/api/reactions";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { useReactionStore } from "@/stores/reactions";
import { ListFooter } from "./list-footer";
import { RowsSkeleton, useRowsEnter } from "./quote-list";
import { QuoteRow } from "./quote-row";
import { RetryNote, StateNote } from "./state-note";

const COPY = {
  favorite: { title: "我的收藏", path: "/v1/me/favorites?limit=20", empty: "你還沒有收藏任何說說", undo: "取消收藏", field: "favorited" },
  like: { title: "我的按讚", path: "/v1/me/likes?limit=20", empty: "你還沒有按讚任何說說", undo: "取消按讚", field: "liked" },
} as const;

type Item = (FavoriteItem | LikeItem) & { favorited_at?: string; liked_at?: string };

export function MyReactions({ kind }: { kind: "favorite" | "like" }) {
  const copy = COPY[kind];
  const { items, setItems, status, hasMore, loadMore, reload } = usePagedList<Item>(copy.path);
  const list = useRowsEnter(status === "loading" ? 0 : items.length);

  const undo = async (id: string) => {
    try {
      await sendReaction(id, kind, false);
      useReactionStore.getState().merge(id, { [copy.field]: false });
      setItems((current) => current.filter((item) => item.quote?.id !== id));
    } catch (failure) {
      void notify(failureMessage(failure));
    }
  };

  return (
    <>
      <h1 className="section-title">{copy.title}</h1>
      {status === "loading" ? (
        <RowsSkeleton />
      ) : status === "error" && items.length === 0 ? (
        <RetryNote title="列表沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title={copy.empty}>
          <Link className="button button-primary" href="/quotes">
            去看看說說
          </Link>
        </StateNote>
      ) : (
        <div className="rows" ref={list}>
          {items.map((item, index) =>
            item.quote ? (
              <QuoteRow
                key={item.quote.id}
                quote={item.quote}
                actions={
                  <button type="button" className="text-button" onClick={() => void undo(item.quote!.id)}>
                    {copy.undo}
                  </button>
                }
              />
            ) : (
              // §8.7.3: the quote has since been removed or deleted
              <div className="quote-row-item" key={index}>
                <p>這則說說已無法顯示。</p>
              </div>
            ),
          )}
        </div>
      )}
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}
