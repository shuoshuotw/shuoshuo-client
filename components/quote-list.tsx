"use client";

import { Children, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Page, Quote } from "@/lib/api/client";
import { useLiveQuoteStats } from "@/lib/live-stats";
import { isReturning, recall, remember } from "@/lib/navigation";
import { usePagedList } from "@/lib/use-paged-list";
import { staggerRows } from "@/motion/anime";
import { ListFooter } from "./list-footer";
import { useListReactions } from "./reaction-buttons";
import { QuoteChartRow, QuotePodium, QuoteRow, QuoteRowSkeleton } from "./quote-row";
import { Reveal } from "./reveal";
import { RetryNote } from "./state-note";
import { TypeCase } from "./type-case";

/** M-09: rows that are new since the last render come in. theme.js masks the first paint until this runs. `still`: the
 rows there at first are a list being returned to, already seen, and stand where they were. */
export function useRowsEnter<T extends HTMLElement = HTMLDivElement>(count: number, still = false) {
  const list = useRef<T>(null);
  const seen = useRef(still ? count : 0);

  useLayoutEffect(() => {
    const root = list.current;
    if (count < seen.current) seen.current = 0;
    const fresh = root ? Array.from(root.children).slice(seen.current) : [];
    seen.current = count;
    if (fresh.length > 0) void staggerRows(fresh);
    else document.documentElement.classList.remove("pick-pending");
  }, [count]);

  return list;
}

/** For rows a server component already rendered. */
export function RowsEnter({ children }: { children: ReactNode }) {
  const list = useRowsEnter(Children.count(children));
  return (
    <div className="rows" ref={list}>
      {children}
    </div>
  );
}

export function RowsSkeleton({ ranked = false }: { ranked?: boolean }) {
  return (
    <div className="rows" data-layout={ranked ? "ranking" : "gallery"} aria-busy="true">
      {Array.from({ length: ranked ? 6 : 8 }, (_, index) => (
        <QuoteRowSkeleton key={index} ranked={ranked} />
      ))}
    </div>
  );
}

type Props = {
  /** Without a query string; the filter and the page size are added here. */
  path: string;
  initial: Page<Quote> | null;
  limit?: number;
  filter?: boolean;
  /** A gallery of cards, or the trending board: a podium of five and a chart below */
  layout?: "gallery" | "ranking";
  empty: ReactNode;
};

type Kept = { category: string | null; page: Page<Quote> };

export function QuoteList({ path, initial, limit = 20, filter = true, layout = "gallery", empty }: Props) {
  // Returned to from a quote, the list is as it was left: its filter, and every page it had loaded
  const key = `list:${path}`;
  const [kept] = useState(() => (isReturning() ? recall<Kept>(key) : undefined));
  const [category, setCategory] = useState<string | null>(kept?.category ?? null);
  const query = category ? `?limit=${limit}&categories=${category}` : `?limit=${limit}`;
  const { items, cursor, status, hasMore, loadMore, reload } = usePagedList<Quote>(`${path}${query}`, kept?.page ?? initial);
  const list = useRowsEnter(status === "loading" ? 0 : items.length, kept !== undefined);
  useEffect(() => remember(key, { category, page: { items, nextCursor: cursor } } satisfies Kept), [key, category, items, cursor]);
  const ranked = layout === "ranking";
  useListReactions(items);
  // The likes and comments on screen follow the database as they change
  useLiveQuoteStats();

  return (
    <>
      {filter && (
        <div className="list-filter">
          <TypeCase selected={category} onSelect={setCategory} />
        </div>
      )}
      <Reveal loading={status === "loading"} skeleton={<RowsSkeleton ranked={ranked} />}>
        {status === "error" && items.length === 0 ? (
          <RetryNote title="列表沒有載入成功" onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          empty
        ) : (
          <div className="rows" data-layout={layout} ref={list}>
            {items.map((quote, index) =>
              !ranked ? (
                <QuoteRow key={quote.id} quote={quote} />
              ) : index < 5 ? (
                <QuotePodium key={quote.id} quote={quote} rank={index + 1} />
              ) : (
                <QuoteChartRow key={quote.id} quote={quote} rank={index + 1} />
              ),
            )}
          </div>
        )}
      </Reveal>
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} />
    </>
  );
}
