"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

type Props = { tabs: { href: string; label: string }[] };

/** M-22 for tabs that are real URLs: the block slides from the old tab to the new one. Next keeps this mounted across them. */
export function RouteTabs({ tabs }: Props) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [block, setBlock] = useState({ left: 0, width: 0 });
  // usePathname is encoded the same way the hrefs are, except for case in the percent escapes
  const current = decodeURIComponent(pathname);

  useLayoutEffect(() => {
    const active = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) setBlock({ left: active.offsetLeft, width: active.offsetWidth });
  }, [current]);

  return (
    <nav className="route-tabs" ref={nav} aria-label="分頁">
      <span className="route-tabs-block" style={{ transform: `translateX(${block.left}px)`, width: block.width }} />
      {tabs.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={decodeURIComponent(href) === current ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
