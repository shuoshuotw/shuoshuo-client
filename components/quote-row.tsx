import Link from "next/link";
import type { ReactNode } from "react";
import type { OwnQuote, Quote } from "@/lib/api/client";
import { stockOf } from "./quote-sheet";

/** D-35: a deleted account's name may belong to someone else now, so it says so and links nowhere. */
export function SubmitterName({ submitter }: { submitter: Quote["submitter"] }) {
  if (submitter.deleted) return <span>{submitter.username}（已刪除）</span>;
  return (
    <Link className="text-link" href={`/u/${encodeURIComponent(submitter.username)}`}>
      {submitter.username}
    </Link>
  );
}

/** One quote in a list: a strip of the paper it was printed on. */
export function QuoteRow({ quote, actions }: { quote: Quote | OwnQuote; actions?: ReactNode }) {
  return (
    <article className="quote-row-item" style={stockOf(quote.category.key)}>
      <Link href={`/q/${quote.id}`} className="quote quote-row">
        {quote.content}
      </Link>
      <footer className="quote-row-meta">
        <span>{quote.source_from}</span>
        <span>{quote.category.name}</span>
        <SubmitterName submitter={quote.submitter} />
        <span>{quote.stats.like_count} 個讚</span>
        {actions}
      </footer>
    </article>
  );
}

export function QuoteRowSkeleton() {
  return (
    <div className="quote-row-item quote-row-skeleton" aria-hidden="true">
      <span className="skeleton-lines">
        <span />
        <span />
      </span>
    </div>
  );
}
