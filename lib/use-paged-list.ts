"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPage } from "@/lib/api/browser";
import type { Page } from "@/lib/api/client";

export type ListStatus = "loading" | "ready" | "more" | "error";

const withCursor = (path: string, cursor: string) => `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;

/** One cursor-paged list. Changing `path` starts over; `initial` is the server-rendered first page of the first path. */
export function usePagedList<T>(path: string, initial: Page<T> | null = null) {
  const [items, setItems] = useState<T[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState(initial?.nextCursor ?? null);
  const [status, setStatus] = useState<ListStatus>(initial ? "ready" : "loading");
  const firstPath = useRef(initial ? path : null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const run = (latest.current += 1);
    setStatus("loading");
    try {
      const page = await apiPage<T>(path);
      if (run !== latest.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch {
      if (run === latest.current) setStatus("error");
    }
  }, [path]);

  useEffect(() => {
    if (firstPath.current === path) {
      firstPath.current = null;
      return;
    }
    void reload();
  }, [path, reload]);

  const loadMore = useCallback(async () => {
    if (!cursor || status !== "ready") return;
    const run = (latest.current += 1);
    setStatus("more");
    try {
      const page = await apiPage<T>(withCursor(path, cursor));
      if (run !== latest.current) return;
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch {
      if (run === latest.current) setStatus("error");
    }
  }, [cursor, path, status]);

  return { items, setItems, cursor, status, hasMore: cursor !== null, loadMore, reload };
}
