"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { prefersReduced } from "@/motion/log";
import { springEase } from "@/motion/spring";

let spring: ReturnType<typeof springEase> | undefined;

/**
 * A number that re-enters digit by digit with a blur when it changes (transitions-dev number pop-in). Digits it shares
 * with the last value stay still; new ones rise in when it grows and drop in when it shrinks. Its width springs to the
 * new one (bencho.dev's Search), so whatever sits after it moves with it instead of jumping.
 */
export function Digits({ value }: { value: number }) {
  const text = String(value);
  const [shown, setShown] = useState({ text, previous: text, turn: 0, up: true });
  if (shown.text !== text) setShown({ text, previous: shown.text, turn: shown.turn + 1, up: value > Number(shown.text) });
  let same = 0;
  while (same < shown.previous.length && same < text.length && shown.previous[same] === text[same]) same++;

  const group = useRef<HTMLSpanElement>(null);
  const rest = useRef(0);
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    // Layout widths, so a magnet's scale on the button never counts. A width still springing starts from where it is
    const width = () => parseFloat(getComputedStyle(root).width);
    const running = root.getAnimations();
    const from = running.length ? width() : rest.current;
    for (const animation of running) animation.cancel();
    const to = width();
    rest.current = to;
    if (!from || Math.abs(to - from) < 0.5 || prefersReduced()) return;
    spring ??= springEase();
    root.animate({ width: [`${from}px`, `${to}px`] }, spring);
  }, [text]);

  return (
    <span ref={group} className="t-digit-group" data-dir={shown.up ? "up" : "down"}>
      {Array.from(text, (char, index) => {
        // A changed digit gets a new key, so it mounts again and its keyframe plays
        const changed = shown.turn > 0 && index >= same;
        return (
          <span key={changed ? `${shown.turn}-${index}` : index} className="t-digit" data-pop={changed || undefined} style={{ "--i": index - same } as CSSProperties}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
