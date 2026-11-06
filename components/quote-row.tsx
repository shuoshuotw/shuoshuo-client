import { Award, Heart, Medal, MessageCircle, Trophy } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { OwnQuote, Quote } from "@/lib/api/client";
import type { ReactionKind } from "@/stores/reactions";
import { CategoryChip, CategoryIcon } from "./category-icon";
import { CommentsButton } from "./comments-dialog";
import { ReactionButton } from "./reaction-buttons";
import { categoryName, QuoteCredit } from "./quote-sheet";
import { VerifiedMark } from "./verified";

/**
 * D-35: a deleted account's name may belong to someone else now, so it says so and links nowhere. An account the site
 * vouches for (說說官方) has its check after the name, outside the link, so only the name travels into the profile.
 */
export function SubmitterName({ submitter }: { submitter: Quote["submitter"] }) {
  if (submitter.deleted) return <span>{submitter.username}（已刪除）</span>;
  const name = (
    // data-profile: the name and the picture beside it travel into the profile's head (profile-morph.ts)
    <Link className="text-link" href={`/u/${encodeURIComponent(submitter.username)}`} data-profile>
      {submitter.username}
    </Link>
  );
  return submitter.verified ? (
    <span className="verified-name">
      {name}
      <VerifiedMark />
    </span>
  ) : (
    name
  );
}

// Short quotes stand large on the stage, long ones smaller, so every card keeps its stage's shape
export const stageSize = (length: number) => (length <= 20 ? "l" : length <= 60 ? "m" : "s");

const glow = (quote: Quote | OwnQuote) => ({ "--glow": `var(--stock-${quote.category.key})` }) as CSSProperties;

/**
 * The like (or, in a list of favourites, the favourite) and the comments, working where the quote is shown: the
 * reaction springs in place and the comments open in a dialog that grows out of the card (M-04). A quote that is not
 * public shows its counts only.
 */
export function QuoteActions({ quote, reaction = "like", fromTrigger }: { quote: Quote | OwnQuote; reaction?: ReactionKind; fromTrigger?: boolean }) {
  if (quote.status !== "published") {
    return (
      <span className="quote-row-meta">
        <span className="quote-card-count">
          <Heart aria-hidden="true" size={15} />
          {quote.stats.like_count}
          <span className="sr-only"> 個讚</span>
        </span>
        <span className="quote-card-count">
          <MessageCircle aria-hidden="true" size={15} />
          {quote.stats.comment_count}
          <span className="sr-only"> 則留言</span>
        </span>
      </span>
    );
  }
  // Published, so it is a public quote whatever list it came from
  const shown = quote as Quote;
  return (
    <span className="quote-actions">
      <ReactionButton quote={shown} kind={reaction} size="sm" />
      <CommentsButton quote={shown} size="sm" fromTrigger={fromTrigger} />
    </span>
  );
}

/**
 * One quote in a gallery, in the manner of a bench of live demos: the sentence stands on a dotted stage tinted with its
 * category's colour, the facts sit on a bar beneath. Under the mouse the card tilts toward the pointer and catches the
 * light (motion/tilt.ts). The sentence opens the quote; the like and the comments work on the card itself.
 */
export function QuoteRow({ quote, actions, reaction }: { quote: Quote | OwnQuote; actions?: ReactNode; reaction?: ReactionKind }) {
  return (
    <article className="quote-row-item" style={glow(quote)}>
      <div className="quote-card bench" data-morph-origin>
        <div className="bench-stage" data-size={stageSize(Array.from(quote.content).length)}>
          <div className="bench-top">
            <CategoryChip category={quote.category.key} />
            <cite className="bench-source">{quote.source_from}</cite>
          </div>
          <Link href={`/q/${quote.id}`} className="quote quote-row" data-quote-id={quote.id} data-quote-text draggable={false}>
            {quote.content}
          </Link>
        </div>
        <footer className="bench-bar">
          <QuoteCredit quote={quote} avatar dated />
          <QuoteActions quote={quote} reaction={reaction} />
          {actions && <span className="quote-card-actions">{actions}</span>}
        </footer>
      </div>
    </article>
  );
}

/**
 * The trending board's first five, as a podium: the first on a stage twice the size, the next four two by two beside
 * it, each with its place in a large numeral behind the sentence.
 */
export function QuotePodium({ quote, rank }: { quote: Quote; rank: number }) {
  const Icon = rank === 1 ? Trophy : rank <= 3 ? Medal : Award;
  return (
    <article className="quote-row-item podium" data-rank={rank} style={glow(quote)}>
      <div className="quote-card bench" data-morph-origin>
        <div className="bench-stage" data-size={rank === 1 ? "l" : stageSize(Array.from(quote.content).length)}>
          <span className="podium-numeral" aria-hidden="true">
            <Numeral value={rank} />
          </span>
          <div className="bench-top">
            <span className="podium-place">
              <Icon aria-hidden="true" size={15} />
              第 {rank} 名
            </span>
            <CategoryChip category={quote.category.key} />
          </div>
          <Link href={`/q/${quote.id}`} className="quote quote-row" data-quote-id={quote.id} data-quote-text draggable={false}>
            {quote.content}
          </Link>
        </div>
        <footer className="bench-bar">
          <QuoteCredit quote={quote} avatar />
          <QuoteActions quote={quote} />
        </footer>
      </div>
    </article>
  );
}

/**
 * A place drawn as an outline. A text stroke traces every contour of the glyph, so where a 4's strokes cross the
 * crossing shows; here the stroke is twice as wide and the glyph's own shape masks its inner half, leaving only the
 * outer edge. One mask per place, and a place appears once on a page.
 */
function Numeral({ value }: { value: number }) {
  const text = String(value);
  const width = 62 * text.length;
  const mask = `numeral-${value}`;
  return (
    <svg className="numeral" viewBox={`0 0 ${width} 100`} width={`${0.62 * text.length}em`} height="1em" overflow="visible">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x={-50} y={-50} width={width + 100} height={200}>
          <rect x={-50} y={-50} width={width + 100} height={200} fill="white" />
          <text x={width} y={88} textAnchor="end" fontSize={100} fill="black">
            {text}
          </text>
        </mask>
      </defs>
      <text x={width} y={88} textAnchor="end" fontSize={100} fill="none" stroke="currentColor" mask={`url(#${mask})`}>
        {text}
      </text>
    </svg>
  );
}

/** Sixth place and below: one line of a chart, its place, the sentence and who brought it, and the like at its end. */
export function QuoteChartRow({ quote, rank }: { quote: Quote; rank: number }) {
  return (
    <article className="quote-row-item chart-row" style={glow(quote)} data-morph-origin>
      <span className="chart-rank">
        <span className="sr-only">第 </span>
        {rank}
        <span className="sr-only"> 名</span>
      </span>
      <span className="chart-icon" title={categoryName(quote.category.key)}>
        <CategoryIcon category={quote.category.key} size={18} />
      </span>
      <div className="chart-body">
        <Link href={`/q/${quote.id}`} className="quote quote-row" data-quote-id={quote.id} data-quote-text draggable={false}>
          {quote.content}
        </Link>
        <QuoteCredit quote={quote} avatar />
      </div>
      {/* The row is a thin strip of the chart: the comments grow out of their own button, not the whole line */}
      <QuoteActions quote={quote} fromTrigger />
    </article>
  );
}

export function QuoteRowSkeleton({ ranked = false }: { ranked?: boolean }) {
  if (ranked) {
    return (
      <div className="quote-row-item chart-row chart-skeleton" aria-hidden="true">
        <span className="skeleton-chip chart-rank" />
        <span className="skeleton-lines">
          <span />
          <span />
        </span>
      </div>
    );
  }
  return (
    <div className="quote-row-item quote-row-skeleton" aria-hidden="true">
      <div className="quote-card bench">
        <div className="bench-stage">
          <span className="skeleton-chip" />
          <span className="skeleton-lines">
            <span />
            <span />
          </span>
        </div>
        <div className="bench-bar">
          <span className="skeleton-chip" />
        </div>
      </div>
    </div>
  );
}
