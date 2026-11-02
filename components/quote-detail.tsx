"use client";

import { Check, Flag, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { api, hasSessionCookie } from "@/lib/api/browser";
import type { Quote } from "@/lib/api/client";
import { formatDate, withinMinutes } from "@/lib/format";
import { notify } from "@/lib/toast";
import { useSessionStore } from "@/stores/session";
import { ConfirmButton } from "./confirm-button";
import { EditQuoteButton, EDIT_WINDOW_MINUTES } from "./quote-form";
import { SubmitterName } from "./quote-row";
import { QuoteSheet } from "./quote-sheet";
import { ReactionButtons, useQuoteReactions } from "./reaction-buttons";
import { ReportButton } from "./report-button";

export function QuoteDetail({ initial, children }: { initial: Quote; children: ReactNode }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [shared, setShared] = useState(false);
  const me = useSessionStore((state) => state.me);
  const owner = me !== null && me.id === quote.submitter.id && !quote.submitter.deleted;

  useQuoteReactions(quote);

  // The HTML may be up to a minute old. A signed-in reader may be the author, who has just changed it.
  useEffect(() => {
    if (!hasSessionCookie()) return;
    void api<Quote>(`/v1/quotes/${initial.id}`).then(setQuote).catch(() => {});
  }, [initial.id]);

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      await navigator.share({ url, text: quote.content }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    void notify("連結已複製");
    setTimeout(() => setShared(false), 1600);
  };

  const remove = async () => {
    await api(`/v1/quotes/${quote.id}`, { method: "DELETE" });
    void notify("已刪除這則說說");
    router.push("/me/quotes");
  };

  return (
    <>
      <div className="detail-paper">
        <h1 className="sr-only">說說詳情</h1>
        <QuoteSheet quote={quote} />
      </div>
      <div className="detail-side">
        {quote.status === "under_review" && (
          <p className="banner" role="status">
            這則說說正在審核中，隨機抽取暫時不會出現。
          </p>
        )}
        <p className="detail-meta">
          <span>
            由 <SubmitterName submitter={quote.submitter} /> 提交
          </span>
          <time dateTime={quote.created_at}>{formatDate(quote.created_at)}</time>
          {quote.edited_at && <span>已編輯</span>}
          {quote.commit_from === "api" && <span>經由 API</span>}
        </p>
        <div className="detail-actions">
          <ReactionButtons quote={quote} />
          <button type="button" className="tool tool-count" aria-label={shared ? "連結已複製" : "分享連結"} onClick={() => void share()}>
            {shared ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
            <span className="tool-label">分享</span>
          </button>
          {me && !owner && (
            <ReportButton path={`/v1/quotes/${quote.id}/reports`} triggerClassName="tool tool-count" title="檢舉這則說說">
              <Flag aria-hidden="true" />
              <span className="tool-label">檢舉</span>
            </ReportButton>
          )}
          {!me && (
            <Link className="tool tool-count" href={`/login?next=/q/${quote.id}`} aria-label="登入後檢舉">
              <Flag aria-hidden="true" />
              <span className="tool-label">檢舉</span>
            </Link>
          )}
        </div>
        {owner && (
          <div className="detail-owner">
            {withinMinutes(quote.created_at, EDIT_WINDOW_MINUTES) && <EditQuoteButton quote={quote} onSaved={setQuote} />}
            <ConfirmButton
              label="刪除"
              title="刪除這則說說"
              body="刪除後無法復原，按讚、收藏與留言也會一併消失。"
              confirm="確定刪除"
              onConfirm={remove}
            />
          </div>
        )}
        {children}
      </div>
    </>
  );
}
