import type { AutoLayout } from "animejs";
import { logMotion, prefersReduced } from "./log";

// Every anime.js move lives here (§13.1). Standalone modules, loaded when first used.
const loadAnimate = () => import("animejs").then((module) => module);

/** M-06: the icon pops and six small squares of type fly out. */
export async function burstLike(button: HTMLElement, icon: Element) {
  if (prefersReduced()) {
    logMotion("M-06", "reduced", "start");
    return;
  }
  const { animate } = await loadAnimate();
  logMotion("M-06", "full", "start");
  animate(icon, { scale: [0.8, 1.15, 1], duration: 500, ease: "cubicBezier(0.34, 1.36, 0.64, 1)" });

  const box = icon.getBoundingClientRect();
  const origin = button.getBoundingClientRect();
  for (let index = 0; index < 6; index += 1) {
    const sort = document.createElement("span");
    sort.className = "burst-sort";
    sort.style.left = `${box.left - origin.left + box.width / 2}px`;
    sort.style.top = `${box.top - origin.top + box.height / 2}px`;
    button.append(sort);
    const angle = (index / 6) * Math.PI * 2;
    animate(sort, {
      x: Math.cos(angle) * 26,
      y: Math.sin(angle) * 26,
      opacity: [1, 0],
      duration: 500,
      ease: "outQuad",
      onComplete: () => sort.remove(),
    });
  }
}

/** M-07 */
export async function pressFavorite(icon: Element) {
  if (prefersReduced()) {
    logMotion("M-07", "reduced", "start");
    return;
  }
  const { animate } = await loadAnimate();
  logMotion("M-07", "full", "start");
  animate(icon, { scale: [1, 1.1, 1], duration: 250, ease: "outExpo" });
}

/** M-08 */
export async function drawCheck(path: SVGPathElement) {
  if (prefersReduced()) {
    logMotion("M-08", "reduced", "start");
    return;
  }
  const { animate, svg } = await loadAnimate();
  logMotion("M-08", "full", "start");
  animate(svg.createDrawable(path), { draw: ["0 0", "0 1"], duration: 500, ease: "inOutSine" });
}

/** M-09: the first twelve rows only; anything lower is off screen anyway. */
export async function staggerRows(rows: Element[]) {
  const first = rows.slice(0, 12);
  if (prefersReduced()) {
    logMotion("M-09", "reduced", "start");
    for (const row of first) row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    return;
  }
  // Hidden before the first await, or the rows flash while anime.js loads
  for (const row of first) (row as HTMLElement).style.opacity = "0";
  document.documentElement.classList.remove("pick-pending");
  const { animate, stagger } = await loadAnimate();
  logMotion("M-09", "full", "start");
  animate(first, { y: [12, 0], opacity: [0, 1], duration: 250, delay: stagger(40), ease: "outExpo" });
}

const layouts = new WeakMap<HTMLDialogElement, AutoLayout>();

/** M-04: a dialog grows out of the button that opened it. `change` shows or closes the <dialog>. Both ends carry the same data-layout-id. Resolves when it has settled. */
export async function morphDialog(dialog: HTMLDialogElement, opening: boolean, change: () => void) {
  if (prefersReduced()) {
    logMotion("M-04", "reduced", "start");
    change();
    return;
  }
  const { createLayout } = await loadAnimate();
  logMotion("M-04", "full", "start");
  let layout = layouts.get(dialog);
  if (!layout) {
    layout = createLayout(dialog, { children: ["[data-layout-id]"] });
    layouts.set(dialog, layout);
  }
  await layout.update(change, { duration: opening ? 250 : 150, ease: "cubicBezier(0.22, 1, 0.36, 1)" });
}
