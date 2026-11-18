"use client";

import type { MouseEvent } from "react";
import { pressPoint, spawnRipple } from "@/motion/ripple";

/**
 * The ripple on a control that is not a HeroUI Button (a link in the column, a tab, a count card): `spread` on its
 * click sends one out from where it was pressed, or from its middle for a key; `ripples` goes inside the control
 * (`position: relative`), a layer of its own shape that clips them, so the control's own glow is left unclipped.
 */
export function usePressRipple() {
  const spread = (event: MouseEvent<HTMLElement>) => {
    const host = event.currentTarget;
    const { x, y } = pressPoint(host, event.nativeEvent);
    spawnRipple(host, x, y, host.querySelector<HTMLElement>(":scope > .press-ripple") ?? host);
  };
  return { spread, ripples: <span className="press-ripple" aria-hidden="true" /> };
}
