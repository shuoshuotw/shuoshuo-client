"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { prefersReduced } from "@/motion/log";
import { quoteTextOf } from "@/motion/quote-morph";

// The new page has this long to arrive before the picture of the old one lets go
const WAIT_MS = 1500;

// Whether this tab has moved between the site's own pages since it loaded, so a step back stays on the site
let moved = false;
// A step back is under way (the Back button, Esc or the browser's own) until the page it lands on has restored itself
let returning = false;
// Where each page was scrolled to when it was left, and what its lists and hands of cards held then
const scrolls = new Map<string, number>();
const memory = new Map<string, unknown>();
const listeners = new Set<() => void>();

const here = () => location.pathname + location.search;
const scroller = () => document.getElementById("app-scroll");

type History = { navigation?: { canGoBack?: boolean } };

/** A step back stays on the site: this tab came from one of its pages (also before a reload). */
export function canGoBack() {
  return moved || Boolean((window as History).navigation?.canGoBack);
}

/** canGoBack for rendering: false on the server and while hydrating, so a page opened straight from outside never shows a way back. */
export function useCanGoBack() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    canGoBack,
    () => false,
  );
}

/** Whether this page is being returned to; read once, as it first renders. */
export function isReturning() {
  return returning;
}

const RETURN_KEY = "shuoshuo:return";

/** Before leaving for a fresh sign-in: the page it comes back to arrives with its own move, even after a full load. */
export function markReturn() {
  try {
    sessionStorage.setItem(RETURN_KEY, "1");
  } catch {}
}

/** Whether this is the page a fresh sign-in has just come back to; true once. */
export function takeReturn() {
  try {
    const back = sessionStorage.getItem(RETURN_KEY) === "1";
    sessionStorage.removeItem(RETURN_KEY);
    return back;
  } catch {
    return false;
  }
}

export function remember(key: string, value: unknown) {
  memory.set(key, value);
}

export function recall<T>(key: string) {
  return memory.get(key) as T | undefined;
}

/**
 * Called once by AppFrame. A click on one of the site's own links notes that the tab has moved and where the page it
 * leaves was scrolled to; a step back puts the page it lands on back at that scroll before it is painted.
 */
export function useNavigationMemory() {
  const pathname = usePathname();
  const first = useRef(pathname);

  useEffect(() => {
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin || link.target === "_blank") return;
      scrolls.set(here(), scroller()?.scrollTop ?? 0);
      if (!moved) {
        moved = true;
        for (const notify of listeners) notify();
      }
    };
    const back = () => {
      returning = true;
    };
    document.addEventListener("click", leave, true);
    addEventListener("popstate", back);
    return () => {
      document.removeEventListener("click", leave, true);
      removeEventListener("popstate", back);
    };
  }, []);

  // After the page's own layout effects, so its restored lists are already there to scroll through
  useLayoutEffect(() => {
    if (pathname !== first.current && !moved) {
      moved = true;
      for (const notify of listeners) notify();
    }
    if (!returning) return;
    returning = false;
    const top = scrolls.get(here());
    const box = scroller();
    if (box && top !== undefined) box.scrollTop = top;
  }, [pathname]);
}

/**
 * Back to the page this one was opened from, as it was left: the list with its filter and everything it had loaded,
 * at the same scroll, and the sentence travels back into the card it came out of. A quote opened straight from
 * outside has nowhere to go back to, and nothing happens.
 */
export function goBack(router: { back: () => void }) {
  if (!canGoBack()) return;
  const id = document.querySelector<HTMLElement>(".detail-stage[data-quote-id]")?.dataset.quoteId;
  if (!id || !document.startViewTransition || prefersReduced()) {
    router.back();
    return;
  }
  let landed: HTMLElement | null = null;
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        router.back();
        const start = performance.now();
        // Rendering is held during the transition, so no animation frame comes to poll with
        const arrived = () => {
          const link = document.querySelector(".detail-stage") ? null : document.querySelector<HTMLElement>(`[data-quote-id="${id}"]`);
          landed = link ? quoteTextOf(link) : null;
          if (landed) landed.style.viewTransitionName = "quote-text";
          if (landed || performance.now() - start > WAIT_MS) resolve();
          else setTimeout(arrived, 16);
        };
        arrived();
      }),
  );
  void transition.finished.finally(() => landed?.style.removeProperty("view-transition-name"));
}
