"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMotionReduced } from "@/lib/motion-pref";
import { prefersReduced } from "@/motion/log";

// The shader arrives after the page; until then, and where WebGL2 is missing, the ground colour shows through
const MeshGradient = dynamic(() => import("@paper-design/shaders-react").then((module) => module.MeshGradient), { ssr: false });

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

/**
 * The site's light, under every page. Behind everything a mesh gradient of warm paper and brand red flows slowly, its shapes
 * warped by noise so no circle ever shows, under a fixed grain. The mouse carries a small round light and a dot stands
 * in for the system cursor; near a control the control pulls toward the pointer and the light sinks into it. Touch and
 * reduced motion keep the gradient (standing still for reduced motion) without the light.
 */
export function Atmosphere() {
  // 減少動畫 switched on this device takes the light, the pull and the dot away at once, and gives the cursor back
  const reduced = useMotionReduced();
  const spot = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  // Inserted after load and faded in: painted from the server HTML, the backdrop counted as a layout shift (MO-10).
  // The light and the dot go to the body, so they ride over the header, the cards and the dock alike.
  const [shown, setShown] = useState(false);
  const [mesh, setMesh] = useState<{ colors: string[]; still: boolean; touch: boolean } | null>(null);
  useEffect(() => {
    setShown(true);
    const root = document.documentElement;
    // Asked once: every probe opens a WebGL context
    const webgl = Boolean(document.createElement("canvas").getContext("webgl2"));
    // The shader takes colours, not variables, so the theme's mesh tokens are read off the root
    const read = () => {
      const style = getComputedStyle(root);
      const colors = [1, 2, 3, 4, 5].map((index) => style.getPropertyValue(`--mesh-${index}`).trim());
      if (webgl) setMesh({ colors, still: prefersReduced(), touch: matchMedia("(pointer: coarse)").matches });
    };
    read();
    // The theme toggle swaps a class on the root. Other classes come and go there too, and each read restyles the page
    let dark = root.classList.contains("dark");
    const watch = new MutationObserver(() => {
      if (root.classList.contains("dark") === dark) return;
      dark = !dark;
      read();
    });
    watch.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, [reduced]);

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
          {mesh && (
            // Rendered at screen resolution at most, capped: a gradient this soft loses nothing to it. A phone draws it
            // at about one pixel per CSS pixel, a third of the cap, so the GPU it shares with every animation on the
            // page has the frame to spare
            <MeshGradient
              className="atmosphere-mesh"
              colors={mesh.colors}
              distortion={0.85}
              swirl={0.3}
              grainMixer={0.06}
              speed={mesh.still ? 0 : 0.32}
              minPixelRatio={1}
              maxPixelCount={mesh.touch ? 420_000 : 1_400_000}
            />
          )}
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
