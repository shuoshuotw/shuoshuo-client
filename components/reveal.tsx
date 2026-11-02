"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { revealSections } from "@/motion/gsap";

/** M-10 for every [data-reveal-group] inside. Everything is visible until the script runs. */
export function Reveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let undo = () => {};
    let gone = false;
    void revealSections(element).then((cleanup) => {
      if (gone) cleanup();
      else undo = cleanup;
    });
    return () => {
      gone = true;
      undo();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
