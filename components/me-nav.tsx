"use client";

import { ScrollShadow } from "@heroui/react";
import { Bookmark, Heart, KeyRound, ListChecks, type LucideIcon, MessageSquareWarning, PenLine, Scale, ScrollText, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSessionStore } from "@/stores/session";
import { useDockSlot, useSlidingPill } from "./dock-slot";
import { usePressRipple } from "./ripple";

type NavLink = { href: string; label: string; icon: LucideIcon };

export const ME_LINKS: NavLink[] = [
  { href: "/me", label: "我的帳號", icon: UserRound },
  { href: "/me/quotes", label: "我的提交", icon: PenLine },
  { href: "/me/favorites", label: "我的收藏", icon: Bookmark },
  { href: "/me/likes", label: "我的按讚", icon: Heart },
  { href: "/me/api-keys", label: "API Key", icon: KeyRound },
  { href: "/me/security", label: "安全設置", icon: ShieldCheck },
  { href: "/me/standing", label: "違規與申訴", icon: Scale },
];

// The back office, for admins only, under the same column: each is current for its own pages too (a case under the queue)
export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/cases", label: "審核佇列", icon: ListChecks },
  { href: "/admin/appeals", label: "使用者申訴", icon: MessageSquareWarning },
  { href: "/admin/audit", label: "稽核日誌", icon: ScrollText },
];

export const isCurrent = (pathname: string, href: string) => pathname === href || (href.startsWith("/admin/") && pathname.startsWith(`${href}/`));

/**
 * A glass column beside the page on a wide screen, its current page under a pill that slides from one to the next; an
 * admin's back office follows under its own heading. On a phone the tabs join the dock as its bar, icons only: the bar
 * is the dock's glass, and the row of icons inside it scrolls under its own shadows when the folded dock leaves it less
 * room than it needs.
 */
export function MeNav() {
  const pathname = usePathname();
  const admin = useSessionStore((state) => state.me?.roles.includes("admin") ?? false);
  const nav = useRef<HTMLElement>(null);
  const slot = useDockSlot();
  useSlidingPill(nav, `${pathname}${slot ? " docked" : ""}${admin ? " admin" : ""}`);
  // A row that scrolls keeps the current tab in sight
  useEffect(() => {
    nav.current?.querySelector("[aria-current='page']")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [pathname, slot]);

  const item = (link: NavLink) => <NavItem key={link.href} link={link} current={isCurrent(pathname, link.href)} />;

  const tabs = (
    <ScrollShadow ref={nav} orientation="horizontal" hideScrollBar size={40} as="nav" className="me-nav" aria-label="個人中心">
      <span className="nav-pill" aria-hidden="true" />
      {ME_LINKS.map(item)}
      {admin && (
        <>
          <span className="me-nav-group" aria-hidden="true">
            管理
          </span>
          {ADMIN_LINKS.map(item)}
        </>
      )}
    </ScrollShadow>
  );
  return slot ? createPortal(<div className="me-dock-bar">{tabs}</div>, slot) : tabs;
}

/** One page of the column, its ripple spreading from where it was pressed. */
function NavItem({ link: { href, label, icon: Icon }, current }: { link: NavLink; current: boolean }) {
  const { spread, ripples } = usePressRipple();
  return (
    <Link href={href} data-magnet aria-current={current ? "page" : undefined} onClick={spread}>
      <Icon aria-hidden="true" size={18} />
      <span className="me-nav-label">{label}</span>
      {ripples}
    </Link>
  );
}
