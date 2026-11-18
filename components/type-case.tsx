"use client";

import { Button, ScrollShadow } from "@heroui/react";
import { ChevronUp, LayoutGrid, X } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORIES } from "@/lib/categories";
import { categoryMotion } from "@/motion/category";
import { prefersReduced } from "@/motion/log";
import { moving, shapeBox } from "@/motion/morph-box";
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

// The body's pieces (motion/morph-box.ts): the bar's shadow and the taller box's, the line as two bands and four
// corners, and four clips one in another, the innermost holding what the body shows
const PARTS = ["across", "down", "tl", "tr", "bl", "br"];

// The body springs to every new size, as it always has
const SPRING = springEase(420, 32);

type View = "row" | "chip" | "panel";

/**
 * The categories in the phone's dock: 全部 and a few on a bar, the chosen one always among them, and a button that
 * opens the bar out into all of them (bencho.dev's Create menu: the bar's own body springs to the panel's size while
 * the choices rise in). Scrolling down folds the bar into a chip of the chosen category in its colour. Each change puts
 * what the body shows in place at once and springs the body from its last size to the new one, clipping what it holds
 * on the way. The body is a morph box (motion/morph-box.ts), so the spring is all transforms: sprung by its width and
 * height it laid the dock out again on every frame, which a phone could not keep up with. The bar, the chip and the
 * panel are all there from the start (the panel's fourteen choices were built at the tap), each shown in its turn, and
 * opening or closing the panel renders none of them again.
 */
function DockCases({ selected, onPick }: { selected: string | null; onPick: (key: string | null, button: Element | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [folded, setFolded] = useState(false);
  const view: View = open ? "panel" : folded ? "chip" : "row";
  const latest = useRef(view);
  const placed = useRef(false);
  // The latest handler, so the choices are built again only when the selection changes
  const picked = useRef(onPick);
  useEffect(() => {
    picked.current = onPick;
  });

  // The dock folds when the page scrolls down (MobileDock), and the bar with it. It follows the way the dock is going
  // (data-fold), from the move's first frame
  useEffect(() => {
    const dock = root.current?.closest<HTMLElement>(".dock");
    if (!dock) return;
    const follow = () => {
      const now = dock.dataset.fold === "true";
      setFolded(now);
      if (now) setOpen(false);
    };
    follow();
    const watch = new MutationObserver(follow);
    watch.observe(dock, { attributes: true, attributeFilter: ["data-fold"] });
    return () => watch.disconnect();
  }, []);

  // The body is as big as the panel, and shows the rectangle of whatever is in view: the panel's own, or the bar's or
  // the chip's as a pill at its foot, in the middle
  const place = useCallback((timing?: KeyframeAnimationOptions) => {
    const body = box.current;
    if (!body) return;
    const part = (name: string) => body.querySelector<HTMLElement>(name);
    const panel = part(".dock-cases-panel");
    const row = part(".dock-cases-row");
    const chip = part(".dock-cases-fold");
    if (!panel || !row || !chip) return;
    // What it holds sits 6px in: the line and the old box's 5px of padding
    const W = panel.offsetWidth + 12;
    const H = panel.offsetHeight + 12;
    const size = `${W}px|${H}px`;
    const resized = body.dataset.size !== size;
    if (resized) {
      body.dataset.size = size;
      [body.style.width, body.style.height] = size.split("|") as [string, string];
    }
    body.style.setProperty("--chip-w", `${chip.offsetWidth + 12}px`);
    const pill = (content: HTMLElement) => {
      const w = content.offsetWidth + 12;
      return { x: (W - w) / 2, y: H - 56, w, h: 56 };
    };
    const rect = latest.current === "panel" ? { x: 0, y: 0, w: W, h: H } : pill(latest.current === "chip" ? chip : row);
    shapeBox(body, rect, resized ? undefined : timing);
  }, []);

  useLayoutEffect(() => {
    latest.current = view;
    place(placed.current && !prefersReduced() ? SPRING : undefined);
    placed.current = true;
  }, [view, selected, place]);

  // What it holds changes size by itself too (its fonts arriving): the body follows at once, unless it is on its way
  useEffect(() => {
    const body = box.current;
    if (!body) return;
    const watch = new ResizeObserver(() => !moving(body) && place());
    for (const part of body.querySelectorAll(".dock-cases-row, .dock-cases-fold, .dock-cases-panel")) watch.observe(part);
    return () => watch.disconnect();
  }, [place]);

  // Open: Escape or a tap outside folds it back
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
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

  // Built once for each selection; a change of view only changes the attributes around them
  const { row, chip, panel } = useMemo(() => {
    const choose = (key: string | null, button: Element | null) => {
      picked.current(key, button);
      setOpen(false);
    };
    // The chosen one stays on the bar, in the last place if it is not among the first
    const shown = OPTIONS.slice(0, ROW + 1);
    if (selected && !shown.some(({ key }) => key === selected)) shown[ROW] = OPTIONS.find(({ key }) => key === selected)!;
    return {
      row: (
        <>
          {shown.map((option) => (
            <Choice key={option.key ?? "all"} option={option} on={option.key === selected} magnet={false} onPick={choose} />
          ))}
          <Button isIconOnly radius="full" variant="light" className="dock-cases-more" aria-label="展開全部類別" aria-expanded={false} onPress={() => setOpen(true)}>
            <ChevronUp aria-hidden="true" size={18} />
          </Button>
        </>
      ),
      chip: (
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
      ),
      panel: (
        <>
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
        </>
      ),
    };
  }, [selected]);

  // Whichever is not in view is hidden (styles) and out of reach
  const hidden = (name: View) => ({ inert: view !== name, "aria-hidden": view !== name || undefined });
  return (
    <div ref={root} className="dock-cases" data-view={view} data-all={selected === null} style={tint(selected)}>
      <span ref={box} className="mbox dock-cases-body">
        <span className="mbox-shade" data-shade="low" aria-hidden="true" />
        <span className="mbox-shade" data-shade="high" aria-hidden="true" />
        <span className="mbox-line" aria-hidden="true">
          {PARTS.map((part) => (
            <span key={part} data-part={part} />
          ))}
        </span>
        <span className="mbox-clip" data-corner="bl">
          <span className="mbox-clip" data-corner="br">
            <span className="mbox-clip" data-corner="tr">
              <span className="mbox-clip" data-corner="tl">
                <span className="dock-cases-tint" aria-hidden="true" />
                <div className="dock-cases-row" role="group" aria-label="類別" {...hidden("row")}>
                  {row}
                </div>
                <span className="dock-cases-fold" {...hidden("chip")}>
                  {chip}
                </span>
                <div className="dock-cases-panel" role="group" aria-label="類別" {...hidden("panel")}>
                  {panel}
                </div>
              </span>
            </span>
          </span>
        </span>
      </span>
    </div>
  );
}
