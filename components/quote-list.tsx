"use client";

import { Children, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Page, Quote } from "@/lib/api/client";
import { usePagedList } from "@/lib/use-paged-list";
import { staggerRows } from "@/motion/anime";
import { ListFooter } from "./list-footer";
import { QuoteRow, QuoteRowSkeleton } from "./quote-row";
import { RetryNote } from "./state-note";
import { TypeCase } from "./type-case";

/** M-09: rows that are new since the last render come in. theme.js masks the first paint until this runs. */
export function useRowsEnter(count: number) {
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

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

export function RowsSkeleton() {
  return (
    <div className="rows" aria-busy="true">
      {Array.from({ length: 8 }, (_, index) => (
        <QuoteRowSkeleton key={index} />
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
  empty: ReactNode;
};

export function QuoteList({ path, initial, limit = 20, filter = true, empty }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const query = categories.length ? `?limit=${limit}&categories=${categories.join(",")}` : `?limit=${limit}`;
  const { items, status, hasMore, loadMore, reload } = usePagedList<Quote>(`${path}${query}`, initial);
  const list = useRowsEnter(status === "loading" ? 0 : items.length);

  const toggle = (key: string) => setCategories((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  return (
    <>
      {filter && (
        <div className="list-filter">
          <TypeCase selected={categories} onToggle={toggle} onClear={() => setCategories([])} />
        </div>
      )}
      {status === "loading" ? (
        <RowsSkeleton />
      ) : status === "error" && items.length === 0 ? (
        <RetryNote title="列表沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        empty
      ) : (
        <div className="rows" ref={list}>
          {items.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} />
          ))}
        </div>
      )}
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} />
    </>
  );
}
