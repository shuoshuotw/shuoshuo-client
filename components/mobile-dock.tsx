"use client";

import { Button } from "@heroui/react";
import { BookOpen, FileText, Flame, type LucideIcon, Menu, PenLine, Quote, Rocket, Shield, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AuthButton } from "./auth-button";
import { LinkButton } from "./link-button";
import { Logo } from "./logo";
import { DOCS_URL } from "./site-header";
import { ThemeToggle } from "./theme-toggle";

const TABS: { href: string; label: string; icon: LucideIcon | null }[] = [
  { href: "/", label: "首頁", icon: null },
  { href: "/quotes", label: "說說", icon: Quote },
  { href: "/trending", label: "熱門", icon: Flame },
  { href: "/submit", label: "提交", icon: PenLine },
];

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/quotes", label: "說說", icon: Quote },
  { href: "/trending", label: "近期熱門", icon: Flame },
  { href: "/submit", label: "提交", icon: PenLine },
  { href: DOCS_URL, label: "API 文件", icon: BookOpen },
  { href: `${DOCS_URL}/quickstart`, label: "快速上手", icon: Rocket },
];

// How long the menu takes to fold back into its button (--morph-close-dur), so a page change waits for it
const CLOSE_MS = 300;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * The phone's header, at the bottom where a thumb reaches it: the pages in a bar with the account beside them.
 * Scrolling down folds the bar into a round menu button, and on the home page the quote's toolbar comes down into
 * the space it leaves. The button itself grows into the menu (transitions-dev plus to menu morph): a disclosure, closed
 * by the button, Escape or a tap outside.
 */
export function MobileDock() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dock = useRef<HTMLDivElement>(null);
  const morph = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLElement>(null);
  // The bar's tabs share its width equally, so the pill is placed by its index in CSS and follows the bar's width as
  // it folds without being measured on every frame
  const current = TABS.findIndex(({ href }) => isActive(pathname, href));
  const compact = useRef(false);
  // Counts the times the bar springs back out, to replay the account button's bump
  const bumps = useRef(0);
  const menuWasOpen = useRef(false);
  menuWasOpen.current = menuOpen;
  // While the menu is open or closing, scrolling (a new page resets it) must not move the bar under it
  const frozenUntil = useRef(0);

  // Folds the bar or opens it out, straight on the dock's own element: rendering the dock as the page scrolled was a
  // long task on a phone just as the fold began. Which of the bar and the menu is reachable goes with it
  const fold = useCallback((next: boolean) => {
    const root = dock.current;
    if (!root || compact.current === next) return;
    compact.current = next;
    root.dataset.compact = String(next);
    if (!next) root.dataset.bump = ++bumps.current % 2 ? "a" : "b";
    if (tabs.current) tabs.current.inert = next;
    if (morph.current) morph.current.inert = !next;
  }, []);

  useLayoutEffect(() => {
    if (morph.current) morph.current.inert = true;
  }, []);

  // A bar in the slot can ask for the room back (the categories opening out), and keeps it for a moment of scrolling
  useEffect(() => {
    const expand = () => {
      frozenUntil.current = performance.now() + 600;
      fold(false);
    };
    document.addEventListener("dock-expand", expand);
    return () => document.removeEventListener("dock-expand", expand);
  }, [fold]);

  // Open: the first page link takes focus once the surface has grown; Escape or a tap outside folds it away
  useEffect(() => {
    const root = morph.current;
    if (!menuOpen || !root) return;
    const focus = setTimeout(() => root.querySelector<HTMLElement>(".dock-menu-item")?.focus({ preventScroll: true }), 160);
    const away = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      root.querySelector<HTMLElement>(".dock-menu")?.focus();
    };
    addEventListener("pointerdown", away, true);
    addEventListener("keydown", key);
    return () => {
      clearTimeout(focus);
      removeEventListener("pointerdown", away, true);
      removeEventListener("keydown", key);
    };
  }, [menuOpen]);

  // The scroll is read once a frame, when the frame lays the page out anyway: read in the scroll event itself, it laid
  // the page out a second time while the fold's transitions were running
  useEffect(() => {
    const scroller = document.getElementById("app-scroll");
    if (!scroller) return;
    let last = scroller.scrollTop;
    let frame = 0;
    const read = () => {
      frame = 0;
      const top = scroller.scrollTop;
      if (menuWasOpen.current || performance.now() < frozenUntil.current) {
        last = top;
        return;
      }
      if (Math.abs(top - last) < 8) return;
      fold(top > 96 && top > last);
      last = top;
    };
    const follow = () => {
      frame ||= requestAnimationFrame(read);
    };
    scroller.addEventListener("scroll", follow, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", follow);
    };
  }, [fold]);

  // A page chosen from the menu: the menu closes into its button first, then the bar opens out of it
  useEffect(() => {
    if (!menuWasOpen.current) {
      fold(false);
      return;
    }
    setMenuOpen(false);
    frozenUntil.current = performance.now() + CLOSE_MS + 100;
    const timer = setTimeout(() => fold(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [pathname, fold]);

  const bar = useMemo(
    () => (
      <nav ref={tabs} className="dock-tabs" aria-label="主要導覽" data-pill={current < 0 ? "off" : "on"} style={{ "--i": current } as CSSProperties}>
        <span className="nav-pill" aria-hidden="true" />
        {TABS.map(({ href, label, icon: Icon }) => (
          <LinkButton
            key={href}
            href={href}
            radius="full"
            variant="light"
            className="dock-tab"
            data-active={isActive(pathname, href)}
            aria-current={isActive(pathname, href) ? "page" : undefined}
          >
            {Icon ? <Icon aria-hidden="true" size={20} /> : <Logo size={20} />}
            <span>{label}</span>
          </LinkButton>
        ))}
      </nav>
    ),
    [current, pathname],
  );

  const menu = useMemo(
    () => (
      <div ref={morph} className="t-morph dock-morph" data-open={menuOpen}>
        <div id="dock-menu" className="t-morph-menu dock-sheet" inert={!menuOpen}>
          <div className="dock-sheet-head">
            <Logo />
            <span>說說</span>
          </div>
          <nav aria-label="選單">
            <ul className="dock-menu-list">
              {MENU.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <LinkButton
                    href={href}
                    radius="full"
                    variant="light"
                    className="dock-menu-item"
                    data-active={isActive(pathname, href)}
                    startContent={<Icon aria-hidden="true" size={20} />}
                  >
                    {label}
                  </LinkButton>
                </li>
              ))}
            </ul>
          </nav>
          <p className="dock-menu-legal">
            <LinkButton href="/terms" size="sm" radius="full" variant="light" startContent={<FileText aria-hidden="true" size={16} />}>
              服務條款
            </LinkButton>
            <LinkButton href="/privacy" size="sm" radius="full" variant="light" startContent={<Shield aria-hidden="true" size={16} />}>
              隱私權
            </LinkButton>
          </p>
          {/* The button keeps the left of this row; the theme switch takes the right */}
          <div className="dock-sheet-foot">
            <ThemeToggle />
          </div>
        </div>
        {/* Pinned to the corner the surface grows from, so it stays put while the box opens out of it */}
        <Button
          isIconOnly
          radius="full"
          variant="light"
          className="t-morph-plus dock-menu"
          aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          aria-expanded={menuOpen}
          aria-controls="dock-menu"
          onPress={() => setMenuOpen((open) => !open)}
        >
          <span className="icon-swap" data-swapped={menuOpen} aria-hidden="true">
            <Menu size={22} />
            <X size={22} />
          </span>
        </Button>
      </div>
    ),
    [menuOpen, pathname],
  );

  const account = useMemo(
    () => (
      <div className="dock-account">
        <AuthButton round />
      </div>
    ),
    [],
  );

  return (
    <div ref={dock} className="dock" data-compact="false">
      {/* A page's bar moves in here on a phone: the home page's or a quote's toolbar, the personal centre's tabs */}
      <div id="dock-slot" className="dock-slot" />
      {bar}
      {menu}
      {account}
    </div>
  );
}
