"use client";

import { Ripple, useRipple } from "@heroui/react";
import type { MouseEvent } from "react";

/**
 * HeroUI's ripple on a control that is not a HeroUI Button (a link in the column, a tab, a count card): `spread` on its
 * click sends one out from where it was pressed, or from its middle for a key; `ripples` goes inside the control
 * (`position: relative`), on a layer of its own shape that clips them, so the control's own glow is left unclipped.
 */
export function usePressRipple() {
  const { ripples, onClear, onPress } = useRipple();
  const spread = (event: MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const keyed = event.detail === 0;
    // useRipple reads only these three of react-aria's press event
    onPress({ target: event.currentTarget, x: keyed ? box.width / 2 : event.clientX - box.left, y: keyed ? box.height / 2 : event.clientY - box.top } as unknown as Parameters<typeof onPress>[0]);
  };
  return {
    spread,
    ripples: (
      <span className="press-ripple" aria-hidden="true">
        <Ripple ripples={ripples} onClear={onClear} />
      </span>
    ),
  };
}
