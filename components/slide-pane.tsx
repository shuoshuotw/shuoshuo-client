"use client";

import { type ReactNode, useState } from "react";

/**
 * What a row of tabs shows (待處理, 已處理…): the list of the tab chosen comes in from that tab's side, the way a
 * profile's tabs bring their lists in (page side by side). The side is kept until the next tab, so the list loading
 * in a moment later does not cut its entrance short.
 */
export function SlidePane({ index, children }: { index: number; children: ReactNode }) {
  const [shown, setShown] = useState<{ index: number; enter?: "next" | "back" }>({ index });
  if (shown.index !== index) setShown({ index, enter: index > shown.index ? "next" : "back" });
  return (
    <div key={index} className="slide-pane" data-enter={shown.enter}>
      {children}
    </div>
  );
}
