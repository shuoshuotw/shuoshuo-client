"use client";

import { ArrowUpRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Quote } from "@/lib/api/client";
import { useLiveStats } from "@/stores/live-stats";
import { CommentSection } from "./comment-section";
import { Digits } from "./digits";
import { MorphDialog } from "./morph-dialog";

type Props = {
  quote: Quote;
  /** The word beside the count, as on the home page's toolbar */
  labelled?: boolean;
  size?: "sm" | "md";
  /** Grows out of the button itself rather than the bar or card around it (the trending chart's rows) */
  fromTrigger?: boolean;
};

/**
 * The quote's comments in a dialog over the page, so they can be read and written without leaving it. The dialog
 * grows out of the bar or the card the button sits in (M-04). The sentence and the composer stay at its top; only
 * the comments scroll. The sentence is the way to the quote's own page.
 */
export function CommentsButton({ quote, labelled = false, size = "md", fromTrigger = false }: Props) {
  const count = useLiveStats((state) => state.byQuote[quote.id]?.comment_count) ?? quote.stats.comment_count;
  return (
    <MorphDialog
      title="留言"
      className="comments-dialog"
      closeButton
      fromTrigger={fromTrigger}
      triggerClassName={size === "sm" ? "tool tool-count tool-sm" : "tool tool-count"}
      triggerLabel={`留言 ${count}`}
      magnet
      label={
        <>
          <MessageCircle aria-hidden="true" size={size === "sm" ? 16 : 18} />
          {labelled && <span className="tool-label">留言</span>}
          <span className="count">
            <Digits value={count} />
          </span>
        </>
      }
    >
      {(close) => (
        <>
          <Link
            className="comments-quote"
            href={`/q/${quote.id}`}
            onClick={close}
            aria-label={`讀這句：${quote.content}`}
            style={{ "--glow": `var(--stock-${quote.category.key})` } as CSSProperties}
          >
            <span className="comments-quote-text quote">{quote.content}</span>
            <ArrowUpRight className="comments-quote-go" aria-hidden="true" size={18} />
          </Link>
          <CommentSection quoteId={quote.id} ownerId={quote.submitter.deleted ? null : quote.submitter.id} dialog />
        </>
      )}
    </MorphDialog>
  );
}
