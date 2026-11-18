"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMotionReduced } from "@/lib/motion-pref";
import { prefersReduced } from "@/motion/log";

const REACH = 44;
const PULL = 0.4;
const MAX_SHIFT = 14;
const SPOT = 180;

// A dialog's own buttons, and every field, box and select (a select lets go once its list is open, so the list lands
// on it); nothing inside a closed dialog, which stays laid out (hidden) for its morph
const MAGNETS =
  ":is([data-magnet], .morph-dialog[open] .morph-card :is(button, .button), input.input, textarea.input, .check, .choice-trigger, .choice-option):not([disabled]):not([data-disabled='true']):not([aria-expanded='true']):not(dialog:not([open]) *)";

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

type Kind = "on" | "link" | "drag" | "card" | "text";

const kindOf = (target: Element | null): Kind => {
  if (!target) return "on";
  if (target.closest("textarea, input, [contenteditable='true']")) return "text";
  if (target.closest(".fan")) return "drag";
  if (target.closest(".quote-card")) return "card";
  if (target.closest("a, button, [role='button'], label")) return "link";
  return "on";
};

// One period of a field, in canvas pixels; a field holds two side by side, so sliding one period along loops without a seam.
// Shown about four times its size: at eight times, every canvas pixel showed as a cell of its own
const TILE = 640;
const TALL = 680;
// How strongly the pools are painted into the canvas. The theme's strength is laid on afterwards as the layer's opacity
// (styles/home.css): painted at that strength, a dark theme's pools had some fifty shades between nothing and their
// deepest, and stretched over the screen each step showed as a band of cells
const FIELD_PAINT = 0.6;

/**
 * A field of colour: soft pools of the theme's five hues, each pulled out along the current, the same every visit
 * (seeded). It is painted here once, small, and stretched over the screen: a gradient this soft loses nothing to that,
 * and the picture a phone moves is a few hundred pixels wide.
 */
function paintField(canvas: HTMLCanvasElement, hues: string[], seed: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = TILE * 2;
  canvas.height = TALL;
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const pools = 9;
  for (let index = 0; index < pools; index += 1) {
    const x = ((index + random() * 0.8) / pools) * TILE;
    const y = TALL * (0.24 + random() * 0.52);
    const long = TILE * (0.2 + random() * 0.15);
    const flat = 0.3 + random() * 0.22;
    const turn = (random() - 0.5) * 0.6;
    const hue = hues[index % hues.length]!;
    // Drawn again a period to each side, so what leaves one edge of the period comes in at the other
    for (const shift of [-TILE, 0, TILE, TILE * 2]) {
      context.save();
      context.translate(x + shift, y);
      context.rotate(turn);
      context.scale(1, flat);
      const pool = context.createRadialGradient(0, 0, 0, 0, 0, long);
      for (const [stop, share] of [[0, 1], [0.3, 0.76], [0.6, 0.32], [0.85, 0.07], [1, 0]] as const) pool.addColorStop(stop, `rgb(${hue} / ${FIELD_PAINT * share})`);
      context.fillStyle = pool;
      context.fillRect(-long, -long, long * 2, long * 2);
      context.restore();
    }
  }
}

/**
 * The site's light, under every page: two fields of colour, the hues the categories are printed in, flowing slowly
 * across each other at different angles and speeds under a fixed grain, so the colours between them never stop
 * changing. Each field is a small canvas painted once (paintField) and only ever slid along by CSS (styles/home.css):
 * nothing is drawn again while it moves, which a shader here did on every frame of every animation above it. The mouse
 * carries a small round light and a dot stands in for the system cursor; near a control the control pulls toward the
 * pointer and the light sinks into it.
 */
export function Atmosphere() {
  // 減少動畫 switched on this device takes the light, the pull and the dot away at once, and gives the cursor back
  const reduced = useMotionReduced();
  const spot = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  // Inserted after load and faded in: painted from the server HTML, the backdrop counted as a layout shift (MO-10).
  // The light and the dot go to the body, so they ride over the header, the cards and the dock alike.
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  const fieldA = useRef<HTMLCanvasElement>(null);
  const fieldB = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!shown) return;
    const root = document.documentElement;
    // The canvas takes colours, not variables, so the theme's hues are read off the root
    const paint = () => {
      const style = getComputedStyle(root);
      const hues = [1, 2, 3, 4, 5].map((index) => style.getPropertyValue(`--flow-${index}`).trim());
      if (fieldA.current) paintField(fieldA.current, hues, 7);
      // The second field meets the first with other hues, so no colour only ever crosses itself
      if (fieldB.current) paintField(fieldB.current, [hues[3]!, hues[0]!, hues[4]!, hues[1]!, hues[2]!], 23);
    };
    paint();
    // The theme toggle swaps a class on the root. Other classes come and go there too, and each read restyles the page
    let dark = root.classList.contains("dark");
    const watch = new MutationObserver(() => {
      if (root.classList.contains("dark") === dark) return;
      dark = !dark;
      paint();
    });
    watch.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, [shown]);

  // The light and the dot are popovers in the top layer, so they ride over an open dialog too. A dialog that opens
  // later joins the top layer above them, so they are shown again to come back on top of it
  useEffect(() => {
    const layers = [spot.current, dot.current].filter((layer) => layer !== null);
    if (layers.length === 0 || !("showPopover" in HTMLElement.prototype)) return;
    const raise = () => {
      for (const layer of layers) {
        if (layer.matches(":popover-open")) layer.hidePopover();
        layer.showPopover();
      }
    };
    raise();
    const watch = new MutationObserver((records) => {
      if (records.some(({ target }) => target instanceof HTMLDialogElement && target.open)) raise();
    });
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => watch.disconnect();
  }, [shown]);

  useEffect(() => {
    const light = spot.current;
    const pointer = dot.current;
    if (!light || !pointer || !matchMedia("(pointer: fine)").matches || prefersReduced()) return;
    const root = document.documentElement;
    const scroller = document.getElementById("app-scroll");
    // Where the pull has moved each control, so its resting box is what the pointer is measured against
    const shifts = new WeakMap<HTMLElement, [number, number]>();
    let frame = 0;
    let moved = false;
    let held: HTMLElement | null = null;
    let kind: Kind = "on";
    let px = 0;
    let py = 0;
    // Where the light and the dot are now, and where they are headed
    const now = { sx: 0, sy: 0, wide: 1, tall: 1, dx: 0, dy: 0 };
    const to = { sx: 0, sy: 0, wide: 1, tall: 1, dx: 0, dy: 0 };

    // The sliding pill under the current tab is pulled along with it (useSlidingPill)
    const pillOf = (element: HTMLElement) =>
      element.matches("[data-active='true'], [aria-current='page']") ? element.parentElement?.querySelector<HTMLElement>(":scope > .nav-pill") : null;

    // The pill is marked apart from the tab: the tab's own pulled look (its transform, ring and glow) is not the pill's
    const release = (element: HTMLElement) => {
      delete element.dataset.magnetOn;
      const pill = pillOf(element);
      if (pill) delete pill.dataset.pulled;
      for (const target of [element, pill]) {
        for (const name of ["--mag-x", "--mag-y", "--lit-x", "--lit-y"]) target?.style.removeProperty(name);
      }
      shifts.delete(element);
    };

    const aim = () => {
      let nearest: HTMLElement | null = null;
      let rest: { left: number; top: number; width: number; height: number } | null = null;
      let distance = REACH;
      // Under an open dialog the page is out of reach, so only the dialog's controls pull
      const scope = [...document.querySelectorAll("dialog[open]")].at(-1) ?? document;
      for (const element of scope.querySelectorAll<HTMLElement>(MAGNETS)) {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.bottom < 0 || box.top > innerHeight) continue;
        const [ox, oy] = shifts.get(element) ?? [0, 0];
        const left = box.left - ox;
        const top = box.top - oy;
        // The one already holding the pointer keeps it until another is clearly nearer
        const gap = Math.hypot(clamp(px, left, left + box.width) - px, clamp(py, top, top + box.height) - py) - (element === held ? 6 : 0);
        if (gap < distance) {
          nearest = element;
          distance = gap;
          rest = { left, top, width: box.width, height: box.height };
        }
      }
      if (held && held !== nearest) release(held);
      held = nearest;
      if (nearest && rest) {
        const cx = rest.left + rest.width / 2;
        const cy = rest.top + rest.height / 2;
        const mx = clamp((px - cx) * PULL, -MAX_SHIFT, MAX_SHIFT);
        const my = clamp((py - cy) * PULL, -MAX_SHIFT, MAX_SHIFT);
        nearest.dataset.magnetOn = "true";
        const pill = pillOf(nearest);
        if (pill) pill.dataset.pulled = "true";
        for (const target of [nearest, pill]) {
          target?.style.setProperty("--mag-x", `${mx}px`);
          target?.style.setProperty("--mag-y", `${my}px`);
        }
        // Where the pointer is inside the control, for the highlight that follows it there
        nearest.style.setProperty("--lit-x", `${clamp(((px - rest.left) / rest.width) * 100, 0, 100)}%`);
        nearest.style.setProperty("--lit-y", `${clamp(((py - rest.top) / rest.height) * 100, 0, 100)}%`);
        shifts.set(nearest, [mx, my]);
        // The light and the dot sink into the control, which lights itself in its own shape
        Object.assign(to, { sx: cx + mx, sy: cy + my, wide: 0.2, tall: 0.2, dx: cx + mx, dy: cy + my });
      } else Object.assign(to, { sx: px, sy: py, wide: 1, tall: 1, dx: px, dy: py });
      // Over a card the card catches the light itself (its tilt and glare), so the round light steps back
      light.dataset.state = nearest ? "held" : kind === "text" ? "off" : kind === "drag" || kind === "card" ? "card" : "on";
      pointer.dataset.state = nearest ? "held" : kind === "card" ? "link" : kind;
    };

    const step = () => {
      frame = 0;
      if (moved) {
        moved = false;
        aim();
      }
      for (const key of ["sx", "sy", "wide", "tall"] as const) now[key] += (to[key] - now[key]) * 0.22;
      for (const key of ["dx", "dy"] as const) now[key] += (to[key] - now[key]) * (held ? 0.25 : 0.6);
      light.style.transform = `translate3d(${now.sx - SPOT / 2}px, ${now.sy - SPOT / 2}px, 0) scale(${now.wide}, ${now.tall})`;
      pointer.style.transform = `translate3d(${now.dx}px, ${now.dy}px, 0)`;
      const left = Math.abs(to.sx - now.sx) + Math.abs(to.sy - now.sy) + Math.abs(to.dx - now.dx) + Math.abs(to.dy - now.dy);
      if (left + Math.abs(to.wide - now.wide) * 100 > 0.4) frame = requestAnimationFrame(step);
    };
    const wake = () => {
      moved = true;
      frame ||= requestAnimationFrame(step);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!root.dataset.cursor) {
        // Starts where the mouse already is instead of flying in from the corner
        Object.assign(now, { sx: event.clientX, sy: event.clientY, dx: event.clientX, dy: event.clientY });
        root.dataset.cursor = "custom";
      }
      px = event.clientX;
      py = event.clientY;
      kind = kindOf(event.target as Element);
      wake();
    };
    const leave = () => {
      light.dataset.state = "off";
      pointer.dataset.state = "off";
      if (held) release(held);
      held = null;
    };

    // A dialog opening or closing changes which controls are in reach: whatever held the pointer lets go at once
    const swap = new MutationObserver((records) => {
      if (!records.some(({ target }) => target instanceof HTMLDialogElement)) return;
      if (held) release(held);
      held = null;
      wake();
    });
    swap.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });

    addEventListener("pointermove", move, { passive: true });
    scroller?.addEventListener("scroll", wake, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      swap.disconnect();
      removeEventListener("pointermove", move);
      scroller?.removeEventListener("scroll", wake);
      root.removeEventListener("pointerleave", leave);
      delete root.dataset.cursor;
      light.dataset.state = "off";
      pointer.dataset.state = "off";
      if (held) release(held);
    };
  }, [shown, reduced]);

  return (
    <>
      {shown && (
        <div className="atmosphere" aria-hidden="true">
          <span className="flow flow-a">
            <canvas ref={fieldA} />
          </span>
          <span className="flow flow-b">
            <canvas ref={fieldB} />
          </span>
          <span className="atmosphere-grain" />
        </div>
      )}
      {shown &&
        createPortal(
          <>
            <div ref={spot} className="spotlight" popover="manual" data-state="off" aria-hidden="true" />
            <div ref={dot} className="cursor-dot" popover="manual" data-state="off" aria-hidden="true" />
          </>,
          document.body,
        )}
    </>
  );
}
