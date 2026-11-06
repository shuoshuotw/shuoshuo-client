"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { takeReturn } from "@/lib/navigation";
import { ADMIN_LINKS, isCurrent, ME_LINKS } from "./me-nav";

const LINKS = [...ME_LINKS, ...ADMIN_LINKS];

type Direction = "next" | "back";

// Every case is one page here: stepping from case to case changes only the case (CaseView), not the page around it
const pageOf = (pathname: string) => pathname.replace(/^(\/admin\/cases\/)[^/]+$/, "$1:id");

const depth = (pathname: string) => pathname.split("/").filter(Boolean).length;

/**
 * Moving down the tabs, the new page rises in from below; moving back up, it comes down from above (on a phone,
 * where the tabs run across, from the right or the left), with a short blur either way (page side by side). Under one
 * tab, going deeper (into a case) comes in as the next page and coming back up (to the queue) as the one before.
 * Every page starts at its top, and the page a fresh sign-in comes back to arrives the same way.
 */
export function MeContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = pageOf(pathname);
  const main = useRef<HTMLDivElement>(null);
  const index = LINKS.findIndex(({ href }) => isCurrent(pathname, href));
  // Kept until the next page, so a render in between never takes the entrance away while it plays
  const [shown, setShown] = useState<{ index: number; page: string; enter?: Direction }>({ index, page });
  if (shown.page !== page) {
    const across = index !== shown.index || index === -1;
    setShown({ index, page, enter: across ? (index >= shown.index ? "next" : "back") : depth(page) < depth(shown.page) ? "back" : "next" });
  }

  useLayoutEffect(() => {
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
    if (takeReturn() && main.current) main.current.dataset.enter = "next";
  }, [pathname]);

  return (
    <div ref={main} key={page} className="me-main" data-enter={shown.enter}>
      {children}
    </div>
  );
}
