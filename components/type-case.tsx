"use client";

import { Button, ScrollShadow } from "@heroui/react";
import { ChevronUp, LayoutGrid, X } from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORIES } from "@/lib/categories";
import { categoryMotion } from "@/motion/category";
import { prefersReduced } from "@/motion/log";
import { springEase } from "@/motion/spring";
import { CategoryIcon } from "./category-icon";
import { useDockSlot, useSlidingPill } from "./dock-slot";

type Props = {
  /** One category at a time; null is all of them */
  selected: string | null;
  onSelect: (key: string | null) => void;
};

type Option = { key: string | null; name: string };

const OPTIONS: Option[] = [{ key: null, name: "全部" }, ...CATEGORIES];

// The bar takes the chosen category's colour: its pill, and on a phone the folded chip
const tint = (key: string | null) => ({ "--case-stock": key ? `var(--stock-${key})` : "var(--action)" }) as CSSProperties;

const nameOf = (key: string | null) => OPTIONS.find((option) => option.key === key)?.name ?? "全部";

function Choice({ option, on, magnet, index, onPick }: { option: Option; on: boolean; magnet: boolean; index?: number; onPick: (key: string | null, button: Element | null) => void }) {
  return (
    <Button
      radius="full"
      variant="light"
      className="case-option"
      data-magnet={magnet || undefined}
      data-active={on}
      aria-pressed={on}
      style={{ ...tint(option.key), "--i": index } as CSSProperties}
      startContent={option.key ? <CategoryIcon category={option.key} size={16} /> : <LayoutGrid className="category-icon" aria-hidden="true" size={16} />}
      onPress={(event) => onPick(option.key, event.target as Element)}
    >
      {option.name}
    </Button>
  );
}

/**
 * The 13 categories and 全部 on one glass bar, the chosen one under a pill of its colour that slides from choice to
 * choice; one category at a time. Each choice pulls toward the pointer, and its icon performs its move when chosen
 * (M-20). On a phone the bar moves into the dock instead (DockCases).
 */
export function TypeCase({ selected, onSelect }: Props) {
  const slot = useDockSlot();
  const pick = (key: string | null, button: Element | null) => {
    onSelect(key);
    categoryMotion(button?.closest("button")?.querySelector(".category-icon[data-category]"));
  };
  if (slot) return createPortal(<DockCases selected={selected} onPick={pick} />, slot);
  return <CaseBar selected={selected} onPick={pick} />;
}

function CaseBar({ selected, onPick }: { selected: string | null; onPick: (key: string | null, button: Element | null) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  useSlidingPill(bar, selected);

  // A mouse wheel turns the row while it has more to show that way, and the page once the row's end is reached
  useEffect(() => {
    const row = bar.current;
    if (!row) return;
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const step = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
      const next = Math.min(row.scrollWidth - row.clientWidth, Math.max(0, row.scrollLeft + step));
      if (Math.abs(next - row.scrollLeft) < 1) return;
      event.preventDefault();
      row.scrollLeft = next;
    };
    row.addEventListener("wheel", wheel, { passive: false });
    return () => row.removeEventListener("wheel", wheel);
  }, []);
  // The glass bar stays whole; only the row inside it scrolls and fades at its ends. The row reaches past the bar on
  // every side, so a choice pulled toward the pointer is never cut off at its edge
  return (
    <div className="case-bar" role="group" aria-label="類別" style={tint(selected)}>
      <ScrollShadow ref={bar} orientation="horizontal" hideScrollBar size={40} className="case-scroll">
        <span className="nav-pill" aria-hidden="true" />
        {OPTIONS.map((option) => (
          <Choice key={option.key ?? "all"} option={option} on={option.key === selected} magnet onPick={onPick} />
        ))}
      </ScrollShadow>
    </div>
  );
}

// How many choices the dock's bar shows before the rest are folded behind the button
const ROW = 2;

/**
 * The categories in the phone's dock: 全部 and a few on a bar, the chosen one always among them, and a button that
 * opens the bar out into all of them (bencho.dev's Create menu: the bar's own body springs to the panel's size while
 * the choices rise in). Scrolling down folds the bar into a chip of the chosen category in its colour.
 */
function DockCases({ selected, onPick }: { selected: string | null; onPick: (key: string | null, button: Element | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // The dock folds when the page scrolls down (MobileDock), and the bar with it
  useEffect(() => {
    const dock = box.current?.closest<HTMLElement>(".dock");
    if (!dock) return;
    const follow = () => {
      const folded = dock.dataset.compact === "true";
      setCompact(folded);
      if (folded) setOpen(false);
    };
    follow();
    const watch = new MutationObserver(follow);
    watch.observe(dock, { attributes: true, attributeFilter: ["data-compact"] });
    return () => watch.disconnect();
  }, []);

  // Open: Escape or a tap outside folds it back
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    addEventListener("pointerdown", away, true);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("pointerdown", away, true);
      removeEventListener("keydown", key);
    };
  }, [open]);

  // The bar's body springs from its last size to the new one, from wherever a spring still running has it
  const rest = useRef<DOMRect | null>(null);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const running = element.getAnimations().filter((animation) => animation.id === "dock-cases");
    const from = running.length ? element.getBoundingClientRect() : rest.current;
    for (const animation of running) animation.cancel();
    const to = element.getBoundingClientRect();
    rest.current = to;
    if (!from || (Math.abs(from.width - to.width) < 1 && Math.abs(from.height - to.height) < 1)) return;
    if (prefersReduced()) return;
    element.animate({ width: [`${from.width}px`, `${to.width}px`], height: [`${from.height}px`, `${to.height}px`] }, { ...springEase(420, 32), id: "dock-cases" });
  }, [open, compact, selected]);

  const choose = (key: string | null, button: Element | null) => {
    onPick(key, button);
    setOpen(false);
  };

  // The chosen one stays on the bar, in the last place if it is not among the first
  const row = OPTIONS.slice(0, ROW + 1);
  if (selected && !row.some(({ key }) => key === selected)) row[ROW] = OPTIONS.find(({ key }) => key === selected)!;

  return (
    <div ref={box} className="dock-cases" data-open={open} data-compact={compact && !open} data-all={selected === null} style={tint(selected)}>
      {open ? (
        <div className="dock-cases-panel" role="group" aria-label="類別">
          <div className="dock-cases-head">
            <span>類別</span>
            <Button isIconOnly radius="full" variant="light" size="sm" aria-label="收起類別" onPress={() => setOpen(false)}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>
          <div className="dock-cases-grid">
            {OPTIONS.map((option, index) => (
              <Choice key={option.key ?? "all"} option={option} on={option.key === selected} magnet={false} index={index} onPick={choose} />
            ))}
          </div>
        </div>
      ) : compact ? (
        <Button
          radius="full"
          variant="light"
          className="dock-cases-chip"
          aria-label={`類別：${nameOf(selected)}，展開全部類別`}
          startContent={selected ? <CategoryIcon category={selected} size={16} /> : <LayoutGrid aria-hidden="true" size={16} />}
          onPress={() => {
            // The folded dock opens out again first, so the panel has the dock's whole width
            document.dispatchEvent(new Event("dock-expand"));
            setOpen(true);
          }}
        >
          {nameOf(selected)}
        </Button>
      ) : (
        <div className="dock-cases-row" role="group" aria-label="類別">
          {row.map((option) => (
            <Choice key={option.key ?? "all"} option={option} on={option.key === selected} magnet={false} onPick={choose} />
          ))}
          <Button isIconOnly radius="full" variant="light" className="dock-cases-more" aria-label="展開全部類別" aria-expanded={false} onPress={() => setOpen(true)}>
            <ChevronUp aria-hidden="true" size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
