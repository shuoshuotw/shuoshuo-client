"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersReduced } from "@/motion/log";
import { springEase } from "@/motion/spring";

// Matches --duration-slow, the reveal's length in CSS
const REVEAL_MS = 400;

type Phase = "loading" | "revealing" | "done";

/**
 * Skeleton reveal (transitions-dev 14) for whatever takes a placeholder's place, the content or a failure alike: the
 * skeleton stays on the same spot a moment, fading out under a blur, while what arrived fades up out of one, and the
 * box springs straight to the new height instead of jumping to it. Loading again (a retry) fades the skeleton back in
 * and springs the box the other way. One spring per change, each taking over from wherever the last one was.
 */
export function Reveal({ loading, skeleton, children }: { loading: boolean; skeleton: ReactNode; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(loading ? "loading" : "done");
  // Only what arrived after a skeleton comes in; content that was there from the first paint just stands
  const [entered, setEntered] = useState(false);
  if (loading && phase !== "loading") setPhase("loading");
  if (!loading && phase === "loading") {
    setPhase("revealing");
    setEntered(true);
  }

  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(() => setPhase("done"), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const root = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const spring = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    // Where the box is on screen now (a spring may still be carrying it), then the height it is going to
    const before = spring.current ? box.getBoundingClientRect().height : height.current;
    spring.current?.cancel();
    spring.current = null;
    const after = box.offsetHeight;
    height.current = after;
    if (!entered || !before || Math.abs(before - after) <= 1 || prefersReduced()) return;
    // Clipped while it moves, so a taller skeleton never spills over what comes after the box
    const animation = box.animate({ height: [`${before}px`, `${after}px`], overflow: ["clip", "clip"] }, springEase(380, 34));
    spring.current = animation;
    animation.onfinish = () => {
      if (spring.current === animation) spring.current = null;
    };
  }, [phase, entered]);

  return (
    <div ref={root} className="reveal" data-phase={phase}>
      {phase !== "done" && (
        <div className="reveal-skeleton" data-enter={entered || undefined} aria-hidden={phase === "revealing" || undefined}>
          {skeleton}
        </div>
      )}
      {phase !== "loading" && (
        <div className="reveal-content" data-enter={entered || undefined}>
          {children}
        </div>
      )}
    </div>
  );
}
