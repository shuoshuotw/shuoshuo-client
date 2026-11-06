import { prefersReduced } from "./log";
import { springEase } from "./spring";

export type Origin = { x: number; y: number };

const FLIGHT = springEase(300, 30);
const SLIDE = springEase(320, 32);

const SMOOTH = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * A comment turns into its editor or back (transitions-dev card resize and a cross-blur): the row eases from the
 * height it had to the one it has now, clipped meanwhile, while what took the words' place fades up out of a blur.
 */
export function resize(row: HTMLElement, before: number) {
  const after = row.offsetHeight;
  const shown = row.querySelector<HTMLElement>(".comment-body > :is(.comment-text, .comment-editor)");
  if (prefersReduced()) {
    shown?.animate({ opacity: [0, 1] }, { duration: 160, easing: "ease-out" });
    return;
  }
  if (Math.abs(after - before) > 1) row.animate({ height: [`${before}px`, `${after}px`], overflow: ["clip", "clip"] }, { duration: 260, easing: SMOOTH });
  shown?.animate({ opacity: [0, 1], filter: ["blur(2px)", "blur(0)"] }, { duration: 260, easing: "ease-in-out" });
}

/**
 * A card that eases to its new height whenever what is in it grows or shrinks (transitions-dev card resize): an error
 * coming up under a field, a choice that adds one. Clipped while it moves. Leaves alone a card something else is
 * already moving (collapse). Returns the way to stop watching.
 */
export function followHeight(box: HTMLElement | null) {
  if (!box) return () => undefined;
  let last = box.offsetHeight;
  let moving = false;
  const observer = new ResizeObserver(() => {
    // Another script's animation on it (a CSS transition, such as a hover's, is no reason to stand aside)
    if (moving || box.getAnimations().some((animation) => !("transitionProperty" in animation) && !("animationName" in animation))) return;
    const from = last;
    last = box.offsetHeight;
    if (Math.abs(last - from) <= 1 || prefersReduced()) return;
    moving = true;
    const done = () => {
      moving = false;
    };
    box.animate({ height: [`${from}px`, `${last}px`], overflow: ["clip", "clip"] }, { duration: 300, easing: SMOOTH }).finished.then(done, done);
  });
  observer.observe(box);
  return () => observer.disconnect();
}

/**
 * A deleted comment (or a panel let go) folds away, its box closing up to nothing so what is below rises into its place.
 * The gap its parent keeps after it closes too, so nothing jumps when it finally leaves.
 */
export function collapse(row: HTMLElement | null) {
  if (!row) return Promise.resolve();
  const style = getComputedStyle(row);
  const gap = Number.parseFloat(getComputedStyle(row.parentElement ?? row).rowGap) || 0;
  const keyframes = prefersReduced()
    ? { opacity: [1, 0] }
    : {
        height: [`${row.offsetHeight}px`, "0px"],
        paddingTop: [style.paddingTop, "0px"],
        paddingBottom: [style.paddingBottom, "0px"],
        borderTopWidth: [style.borderTopWidth, "0px"],
        borderBottomWidth: [style.borderBottomWidth, "0px"],
        marginBottom: [style.marginBottom, `${Number.parseFloat(style.marginBottom) - gap}px`],
        opacity: [1, 0],
        filter: ["blur(0)", "blur(3px)"],
        overflow: ["clip", "clip"],
      };
  return row.animate(keyframes, { duration: 320, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }).finished.then(
    () => undefined,
    () => undefined,
  );
}

/**
 * A row taken out of a table fades away under a blur, then leaves (`commit`, which must render at once: flushSync), and
 * the rows below slide up into its place (FLIP). A table row cannot fold its height, so the rows below move instead.
 */
export async function dropRow(row: HTMLElement | null, commit: () => void) {
  const list = row?.parentElement ?? null;
  if (row) {
    const fade = prefersReduced() ? { opacity: [1, 0] } : { opacity: [1, 0], filter: ["blur(0)", "blur(3px)"], transform: ["none", "scale(0.98)"] };
    await row.animate(fade, { duration: 220, easing: "ease-in", fill: "forwards" }).finished.catch(() => undefined);
  }
  const before = rowTops(list);
  commit();
  if (!prefersReduced()) settle(list, before);
}

/** Rows that moved since `before` was taken slide from where they were into where they are now (FLIP). */
function settle(list: HTMLElement | null, before: Map<string, number>, except?: HTMLElement) {
  for (const other of list?.querySelectorAll<HTMLElement>(":scope > [data-id]") ?? []) {
    const was = before.get(other.dataset.id!);
    if (other === except || was === undefined) continue;
    const shift = was - other.getBoundingClientRect().top;
    if (Math.abs(shift) > 1) other.animate({ transform: [`translateY(${shift}px)`, "none"] }, SLIDE);
  }
}

/** Where the written words begin inside the field, so the posted comment's words can leave from there. */
export function textOrigin(field: HTMLTextAreaElement): Origin {
  const box = field.getBoundingClientRect();
  const style = getComputedStyle(field);
  return {
    x: box.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft),
    y: box.top + Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop) - field.scrollTop,
  };
}

/** Where each comment already in the list stands, before the new one pushes them down (FLIP's first). */
export function rowTops(list: HTMLElement | null) {
  const tops = new Map<string, number>();
  for (const row of list?.querySelectorAll<HTMLElement>(":scope > [data-id]") ?? []) tops.set(row.dataset.id!, row.getBoundingClientRect().top);
  return tops;
}

/**
 * The comment just posted arrives in the list: its words travel from the field into their place, its picture, name
 * and buttons fade in around them, and the comments below slide down to make room instead of jumping. The words fly
 * as a copy over everything, so no scrolling box clips them on the way.
 */
export function arrive(row: HTMLElement, from: Origin | null, before: Map<string, number>) {
  if (prefersReduced()) {
    row.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease-out" });
    return;
  }
  settle(row.parentElement, before, row);
  for (const part of row.querySelectorAll<HTMLElement>(":scope > .avatar, .comment-head, .comment-actions")) {
    part.animate({ opacity: [0, 1], transform: ["translateY(4px)", "none"] }, { duration: 320, delay: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" });
  }
  const text = row.querySelector<HTMLElement>(".comment-text");
  if (!text || !from) return;
  const to = text.getBoundingClientRect();
  const style = getComputedStyle(text);
  const ghost = document.createElement("p");
  ghost.textContent = text.textContent;
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    margin: "0",
    zIndex: "1100",
    pointerEvents: "none",
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    whiteSpace: style.whiteSpace,
    overflowWrap: style.overflowWrap,
  });
  document.body.append(ghost);
  text.style.opacity = "0";
  const done = () => {
    ghost.remove();
    text.style.removeProperty("opacity");
  };
  ghost.animate({ transform: [`translate(${from.x - to.left}px, ${from.y - to.top}px)`, "none"] }, FLIGHT).finished.then(done, done);
}
