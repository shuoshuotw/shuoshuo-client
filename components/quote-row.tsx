import Link from "next/link";
import type { Quote } from "@/lib/api/client";
import { stockOf } from "./quote-sheet";

/** One quote in a list: a strip of the paper it was printed on. */
export function QuoteRow({ quote }: { quote: Quote }) {
  return (
    <article className="quote-row-item" style={stockOf(quote.category.key)}>
      <Link href={`/q/${quote.id}`} className="quote quote-row">
        {quote.content}
      </Link>
      <footer className="quote-row-meta">
        <span>{quote.source_from}</span>
        <span>{quote.category.name}</span>
        <span>{quote.stats.like_count} 個讚</span>
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
