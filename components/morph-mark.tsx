"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, ViewTransition } from "react";
import { landMorph, morphWaiting, moveMorph } from "@/motion/quote-morph";

/**
 * Where a morph's view transition starts (motion/quote-morph.ts beginMorph): an empty mark put in again with every
 * page, which enters with a view transition only while a morph is waiting for its page. React then starts the
 * transition itself, once it has made the new page, at the moment it puts it in; the named parts of the two pages
 * (styles, quote-morph) are the transition's own, the mark an empty one beside them. Every other navigation changes
 * pages as before, without one.
 */
export function MorphMark() {
  const pathname = usePathname();
  // Read as the new page renders: a morph begun before its navigation is waiting for it
  const waiting = morphWaiting();
  // In the commit that puts the new page in, before its picture is taken
  useLayoutEffect(landMorph, [pathname]);
  return (
    <ViewTransition key={pathname} enter={waiting ? "morph" : "none"} exit="none" update="none" share="none" default="none" onEnter={moveMorph}>
      <span className="morph-mark" aria-hidden="true" />
    </ViewTransition>
  );
}
