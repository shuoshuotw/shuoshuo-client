"use client";

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

/**
 * On a phone a page's bar joins the dock at the bottom of the screen (MobileDock renders the slot): the home page's
 * toolbar, a quote's toolbar, the personal centre's tabs. Elsewhere the bar stays in the page.
 */
export function useDockSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const phone = matchMedia("(max-width: 767px)");
    const follow = () => setSlot(phone.matches ? document.getElementById("dock-slot") : null);
    follow();
    phone.addEventListener("change", follow);
    return () => phone.removeEventListener("change", follow);
  }, []);
  return slot;
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
