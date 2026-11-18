"use client";

import { type RefObject, useLayoutEffect, useSyncExternalStore } from "react";

let phone: MediaQueryList | null = null;
const phoneQuery = () => (phone ??= matchMedia("(max-width: 767px)"));

/**
 * On a phone a page's bar joins the dock at the bottom of the screen (MobileDock renders the slot): the home page's
 * toolbar, a quote's toolbar, the personal centre's tabs. Elsewhere the bar stays in the page. A page opened from
 * another has it from its first render: found only once the page had mounted, the bar was first laid out in the page,
 * which is what a view transition took its picture of, and the page shifted under it as the bar moved down at the end.
 * Only the page the server rendered (hydrated) starts without it, as the server did.
 */
export function useDockSlot() {
  return useSyncExternalStore(
    (change) => {
      phoneQuery().addEventListener("change", change);
      return () => phoneQuery().removeEventListener("change", change);
    },
    () => (phoneQuery().matches ? document.getElementById("dock-slot") : null),
    () => null,
  );
}

/**
 * A pill that slides under the current item of a row or a column of links (tabs sliding): it is placed from the
 * item's box through --pill-x, --pill-y, --pill-w and --pill-h, jumps there without a transition on first paint,
 * and follows the item when its size changes. `active` is whatever identifies the current item.
 */
export function useSlidingPill(ref: RefObject<HTMLElement | null>, active: unknown) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Only what changed is written: a row resizing on every frame (a dock folding) must not restyle the pill each time
    const set = (name: string, value: string) => {
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };
    const place = () => {
      // A ScrollShadow only checks its fading edges when it scrolls; a row that changes size moves them too
      if (root.matches("[data-left-scroll], [data-left-right-scroll]")) root.dispatchEvent(new Event("scroll"));
      const item = root.querySelector<HTMLElement>("[data-active='true'], [aria-current='page']");
      const pill = item ? "on" : "off";
      if (root.dataset.pill !== pill) root.dataset.pill = pill;
      if (!item) return;
      const first = !root.style.getPropertyValue("--pill-w");
      if (first) root.dataset.pillInstant = "true";
      set("--pill-x", `${item.offsetLeft}px`);
      set("--pill-y", `${item.offsetTop}px`);
      set("--pill-w", `${item.offsetWidth}px`);
      set("--pill-h", `${item.offsetHeight}px`);
      if (first) requestAnimationFrame(() => delete root.dataset.pillInstant);
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(root);
    for (const item of root.querySelectorAll("a, button")) watch.observe(item);
    return () => watch.disconnect();
  }, [ref, active]);
}
