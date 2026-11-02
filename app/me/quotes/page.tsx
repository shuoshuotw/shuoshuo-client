"use client";

import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { ListFooter } from "@/components/list-footer";
import { EDIT_WINDOW_MINUTES, EditQuoteButton } from "@/components/quote-form";
import { RowsSkeleton, useRowsEnter } from "@/components/quote-list";
import { QuoteRow } from "@/components/quote-row";
import { RetryNote, StateNote } from "@/components/state-note";
import { api } from "@/lib/api/browser";
import type { OwnQuote } from "@/lib/api/client";
import { withinMinutes } from "@/lib/format";
import { reasonLabel } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";

export default function MyQuotesPage() {
  const { items, setItems, status, hasMore, loadMore, reload } = usePagedList<OwnQuote>("/v1/me/quotes?limit=20");
  const list = useRowsEnter(status === "loading" ? 0 : items.length);

  const remove = async (id: string) => {
    await api(`/v1/quotes/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
    void notify("已刪除這則說說");
  };

  return (
    <>
      <h1 className="section-title">我的提交</h1>
      {status === "loading" ? (
        <RowsSkeleton />
      ) : status === "error" && items.length === 0 ? (
        <RetryNote title="列表沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title="你還沒有提交說說">
          <Link className="button button-primary" href="/submit">
            提交第一句
          </Link>
        </StateNote>
      ) : (
        <div className="rows" ref={list}>
          {items.map((quote) => (
            <QuoteRow
              key={quote.id}
              quote={quote}
              actions={
                <>
                  {quote.status === "under_review" && <span>審核中</span>}
                  {quote.status === "removed" && <span>已移除：{reasonLabel(quote.removed_reason)}</span>}
                  {quote.status === "published" && withinMinutes(quote.created_at, EDIT_WINDOW_MINUTES) && (
                    <EditQuoteButton quote={quote} onSaved={(saved) => setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)))} />
                  )}
                  {quote.status !== "removed" && (
                    <ConfirmButton
                      label="刪除"
                      title="刪除這則說說"
                      body="刪除後無法復原，按讚、收藏與留言也會一併消失。"
                      confirm="確定刪除"
                      onConfirm={() => remove(quote.id)}
                    />
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}
