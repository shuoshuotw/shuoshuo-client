"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";

const TABS = ["", "/likes", "/favorites"];

/**
 * A profile's tabs run across, so the list of the tab chosen comes in from that side (page side by side), whatever the
 * list holds: rows the server rendered, the owner's own private list loading in the browser, or a note. Every tab, and
 * the profile itself arriving from a card, starts at its top.
 */
export function ProfileContent({ base, children }: { base: string; children: ReactNode }) {
  const pathname = decodeURIComponent(usePathname());
  const index = TABS.findIndex((tab) => pathname === decodeURIComponent(base) + tab);
  const previous = useRef(index);
  const direction = index >= previous.current ? "next" : "back";
  useEffect(() => {
    previous.current = index;
  }, [index]);

  // Before the step back's own scroll is put back (useNavigationMemory runs after this, in AppFrame)
  useLayoutEffect(() => {
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div key={pathname} className="profile-main" data-enter={previous.current === index ? undefined : direction}>
      {children}
    </div>
  );
}
