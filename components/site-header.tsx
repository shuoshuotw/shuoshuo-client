"use client";

import { BookOpen, Flame, type LucideIcon, PenLine, Quote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { AuthButton } from "./auth-button";
import { useSlidingPill } from "./dock-slot";
import { LinkButton } from "./link-button";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export const DOCS_URL = "https://docs.shuoshuotw.xyz";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/quotes", label: "說說", icon: Quote },
  { href: "/trending", label: "近期熱門", icon: Flame },
  { href: "/submit", label: "提交", icon: PenLine },
];

/** Floats over the page and stays mounted across navigations, so only the content moves when the route changes. */
export function SiteHeader() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const active = NAV.find(({ href }) => pathname.startsWith(href))?.href;

  // The pill slides to the current page
  useSlidingPill(nav, active);

  return (
    <header className="site-header">
      <div className="header-bar">
        <Link className="wordmark" href="/" aria-label="說說首頁" data-magnet>
          <Logo size={30} />
          <span>說說</span>
        </Link>
        <nav ref={nav} className="site-nav" aria-label="主要導覽">
          <span className="nav-pill" aria-hidden="true" />
          {NAV.map(({ href, label, icon: Icon }) => (
            <LinkButton
              key={href}
              href={href}
              radius="full"
              variant="light"
              className="nav-item"
              data-magnet
              data-active={active === href}
              aria-current={active === href ? "page" : undefined}
              startContent={<Icon aria-hidden="true" size={18} />}
            >
              {label}
            </LinkButton>
          ))}
          <LinkButton href={DOCS_URL} radius="full" variant="light" className="nav-item" data-magnet startContent={<BookOpen aria-hidden="true" size={18} />}>
            API 文件
          </LinkButton>
        </nav>
        <div className="site-tools">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
