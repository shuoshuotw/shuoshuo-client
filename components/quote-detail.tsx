"use client";

import { Button } from "@heroui/react";
import { ArrowLeft, CalendarDays, Check, Code, Flag, PencilLine, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, hasSessionCookie } from "@/lib/api/browser";
import type { Quote } from "@/lib/api/client";
import { formatDate, withinMinutes } from "@/lib/format";
import { canGoBack, goBack, useCanGoBack } from "@/lib/navigation";
import { notify } from "@/lib/toast";
import { categoryMotion } from "@/motion/category";
import { useSessionStore } from "@/stores/session";
import { CategoryChip } from "./category-icon";
import { ConfirmButton } from "./confirm-button";
import { useDockSlot } from "./dock-slot";
import { LinkButton } from "./link-button";
import { Bracket } from "./logo";
import { EditQuoteButton, EDIT_WINDOW_MINUTES } from "./quote-form";
import { QuoteCredit, QuoteType } from "./quote-sheet";
import { ReactionButtons, useQuoteReactions } from "./reaction-buttons";
import { ReportButton } from "./report-button";

/**
 * The quote on a stage of its own, as on the home page: the brackets hold it in a pool of its category's colour, the
 * credit and the facts sit under it, and the toolbar below carries everything a reader can do with it.
 */
export function QuoteDetail({ initial, children }: { initial: Quote; children: ReactNode }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [shared, setShared] = useState(false);
  const me = useSessionStore((state) => state.me);
  const owner = me !== null && me.id === quote.submitter.id && !quote.submitter.deleted;
  const slot = useDockSlot();
  const stage = useRef<HTMLElement>(null);
  // Opened straight from outside, there is no way back: no button, and Esc does nothing
  const back = useCanGoBack();

  useQuoteReactions(quote);

  // The category's icon performs its move as the quote opens, once the morph that brought it here has landed
  useEffect(() => {
    const timer = setTimeout(() => categoryMotion(stage.current?.querySelector(".detail-facts .category-icon")), 420);
    return () => clearTimeout(timer);
  }, [quote.id]);

  // Escape goes back to the list the quote was opened from. Not while a dialog, a menu or a field has it
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || !canGoBack()) return;
      if (document.querySelector("dialog[open], [role='listbox'], .t-morph[data-open='true']")) return;
      if ((event.target as Element | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      goBack(router);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [router]);

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

  // On a phone the toolbar rides the dock, as the home page's does
  const toolbar = (
    <div className="stage-toolbar detail-actions" role="toolbar" aria-label="這句說說" data-morph-origin>
      {back && (
        <>
          <Button
            radius="full"
            variant="light"
            className="tool-count tool-back"
            data-magnet
            startContent={<ArrowLeft aria-hidden="true" size={18} />}
            onPress={() => goBack(router)}
          >
            <span className="tool-label">返回</span>
            <kbd className="tool-key" aria-hidden="true">
              Esc
            </kbd>
          </Button>
          <span className="toolbar-gap" aria-hidden="true" />
        </>
      )}
      <ReactionButtons quote={quote} />
      <Button
        radius="full"
        variant="light"
        className="tool-count"
        data-magnet
        aria-label={shared ? "連結已複製" : "分享連結"}
        startContent={
          <span className="icon-swap" data-swapped={shared} aria-hidden="true">
            <Share2 size={18} />
            <Check size={18} />
          </span>
        }
        onPress={() => void share()}
      >
        <span className="tool-label">分享</span>
      </Button>
      {me && !owner && (
        <ReportButton path={`/v1/quotes/${quote.id}/reports`} triggerClassName="tool tool-count" magnet title="檢舉這則說說">
          <Flag aria-hidden="true" />
          <span className="tool-label">檢舉</span>
        </ReportButton>
      )}
      {!me && (
        <LinkButton
          href={`/login?next=/q/${quote.id}`}
          radius="full"
          variant="light"
          className="tool-count"
          data-magnet
          aria-label="登入後檢舉"
          startContent={<Flag aria-hidden="true" size={18} />}
        >
          <span className="tool-label">檢舉</span>
        </LinkButton>
      )}
      {owner && (
        <>
          <span className="toolbar-gap" aria-hidden="true" />
          {withinMinutes(quote.created_at, EDIT_WINDOW_MINUTES) && <EditQuoteButton quote={quote} onSaved={setQuote} triggerClassName="tool tool-count" />}
          <ConfirmButton
            label={
              <>
                <Trash2 aria-hidden="true" />
                <span className="tool-label">刪除</span>
              </>
            }
            triggerClassName="tool tool-count tool-danger"
            magnet
            title="刪除這則說說"
            tone="question"
            body="刪除後無法復原，按讚、收藏與留言也會一併消失。"
            confirm="確定刪除"
            onConfirm={remove}
          />
        </>
      )}
    </div>
  );

  return (
    <>
      <section ref={stage} className="detail-stage" data-quote-id={quote.id} style={{ "--tint": `var(--stock-${quote.category.key})` } as CSSProperties}>
        <div className="stage-light" aria-hidden="true" />
        <h1 className="sr-only">說說詳情</h1>
        <figure className="detail-figure">
          <div className="quote-frame">
            <Bracket />
            <QuoteType content={quote.content} />
            <Bracket end />
          </div>
          <figcaption className="detail-meta">
            <QuoteCredit quote={quote} />
            <span className="detail-facts">
              <CategoryChip category={quote.category.key} />
              <time dateTime={quote.created_at}>
                <CalendarDays aria-hidden="true" size={14} />
                {formatDate(quote.created_at)}
              </time>
              {quote.edited_at && (
                <span>
                  <PencilLine aria-hidden="true" size={14} />
                  已編輯
                </span>
              )}
              {quote.commit_from === "api" && (
                <span>
                  <Code aria-hidden="true" size={14} />
                  經由 API
                </span>
              )}
            </span>
          </figcaption>
        </figure>
        {quote.status === "under_review" && (
          <p className="banner" role="status">
            這則說說正在審核中，隨機抽取暫時不會出現。
          </p>
        )}
        {slot ? createPortal(toolbar, slot) : toolbar}
      </section>
      {children}
    </>
  );
}
