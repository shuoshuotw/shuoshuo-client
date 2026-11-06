"use client";

import { Bookmark, Heart, Quote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useDockSlot, useSlidingPill } from "./dock-slot";

// Named rather than passed: the tabs come from a server component, which cannot hand over a component
const ICONS = { quote: Quote, heart: Heart, bookmark: Bookmark };

type Props = { tabs: readonly { href: string; label: string; icon: keyof typeof ICONS }[] };

/**
 * M-22 for tabs that are real URLs: the pill slides from the old tab to the new one (useSlidingPill, so it is pulled
 * along with its tab by the magnet, as on the categories bar). On a phone the tabs join the dock as its bar, like the
 * personal centre's. Next keeps this mounted across them.
 */
export function RouteTabs({ tabs }: Props) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const slot = useDockSlot();
  // usePathname is encoded the same way the hrefs are, except for case in the percent escapes
  const current = decodeURIComponent(pathname);
  useSlidingPill(nav, `${current}${slot ? " docked" : ""}`);

  const bar = (
    <nav className="route-tabs" ref={nav} aria-label="分頁">
      <span className="nav-pill" aria-hidden="true" />
      {tabs.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        return (
          <Link key={href} href={href} data-magnet aria-current={decodeURIComponent(href) === current ? "page" : undefined}>
            <Icon aria-hidden="true" size={18} />
            <span className="route-tab-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
  return slot ? createPortal(<div className="route-dock-bar">{bar}</div>, slot) : bar;
}
