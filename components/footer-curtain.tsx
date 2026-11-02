"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { curtainFooter } from "@/motion/gsap";

export function FooterCurtain({ children }: { children: ReactNode }) {
  const footer = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = footer.current;
    if (!element) return;
    let undo = () => {};
    let gone = false;
    void curtainFooter(element).then((cleanup) => {
      if (gone) cleanup();
      else undo = cleanup;
    });
    return () => {
      gone = true;
      undo();
    };
  }, []);

  return (
    <footer ref={footer} className="site-footer">
      <div>{children}</div>
    </footer>
  );
}
