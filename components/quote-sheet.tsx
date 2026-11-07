import type { CSSProperties } from "react";
import type { Quote } from "@/lib/api/client";
import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { Avatar } from "./avatar";
import { SubmitterName } from "./quote-row";

const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "grapheme" });

// Inline-block characters lose the browser's line-breaking rules, so these are kept with their neighbour by hand
const NO_LINE_START = new Set([..."，。、；：！？）」』》〉…—"]);
const NO_LINE_END = new Set([..."（「『《〈"]);

/** Runs of characters that must not be split across lines: a mark stays with the character it belongs to. */
export function toRuns(chars: string[]) {
  const runs: string[][] = [];
  chars.forEach((char, index) => {
    const previous = chars[index - 1];
    if (runs.length > 0 && (NO_LINE_START.has(char) || (previous !== undefined && NO_LINE_END.has(previous)))) runs.at(-1)!.push(char);
    else runs.push([char]);
  });
  return runs;
}

const LINE_SIZES = [
  { upTo: 20, size: "quote-l" },
  { upTo: 60, size: "quote-m" },
  { upTo: Infinity, size: "quote-s" },
];

export function quoteSize(length: number) {
  return LINE_SIZES.find(({ upTo }) => length <= upTo)?.size ?? "quote-s";
}

export const stockOf = (key: string): CSSProperties => ({ "--stock": `var(--stock-${key})` }) as CSSProperties;

export const categoryName = (key: string) => CATEGORIES.find((category) => category.key === key)?.name ?? key;

/** Every character is its own span so it can be picked and flipped; screen readers get the sentence whole. */
export function QuoteType({ content }: { content: string }) {
  const chars = Array.from(segmenter.segment(content), ({ segment }) => segment);
  return (
    <blockquote className={`quote ${quoteSize(chars.length)}`} data-testid="quote-text">
      <span className="sr-only">{content}</span>
      <span aria-hidden="true">
        {toRuns(chars).map((run, runIndex) => (
          <span className="char-run" key={runIndex}>
            {run.map((char, index) =>
              char === "\n" ? (
                <br key={index} />
              ) : (
                <span className="char" data-char key={index}>
                  {char}
                </span>
              ),
            )}
          </span>
        ))}
      </span>
    </blockquote>
  );
}

export function QuoteSheet({ quote }: { quote: Quote }) {
  return (
    <article className="sheet" style={stockOf(quote.category.key)}>
      <QuoteType content={quote.content} />
      <footer className="sheet-source">
        <span>{quote.source_from}</span>
        <span>{categoryName(quote.category.key)}</span>
      </footer>
    </article>
  );
}

export function SheetBlank({ children }: { children?: React.ReactNode }) {
  return (
    <div className="sheet sheet-blank" data-testid="sheet-blank">
      {children ?? (
        <span className="skeleton-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  );
}

/**
 * "—— 提交者‧出處", in the same place under every quote; in a list, the submitter's picture stands before the name. On a
 * card, whose top carries the source, the name is followed by the day it was submitted instead (`dated`).
 */
export function QuoteCredit({ quote, avatar = false, dated = false }: { quote: Pick<Quote, "submitter" | "source_from" | "created_at">; avatar?: boolean; dated?: boolean }) {
  return (
    <p className="credit" data-avatar={avatar || undefined}>
      {avatar ? <Avatar url={quote.submitter.avatar_url} name={quote.submitter.username} size={22} /> : <span aria-hidden="true">—— </span>}
      <SubmitterName submitter={quote.submitter} />
      <span aria-hidden="true">‧</span>
      {dated ? (
        <>
          <span className="sr-only">，提交於：</span>
          <time dateTime={quote.created_at}>{formatDate(quote.created_at)}</time>
        </>
      ) : (
        <>
          <span className="sr-only">，出處：</span>
          <cite>{quote.source_from}</cite>
        </>
      )}
    </p>
  );
}
