import { logMotion, prefersReduced } from "./log";

// Every anime.js move lives here (§13.1). Standalone modules, loaded when first used.
const loadAnimate = () => import("animejs").then((module) => module);

/** A throwaway element pinned to the icon's centre. Fixed to the viewport, so a button's overflow never clips it. */
function spark(icon: Element, className: string) {
  const box = icon.getBoundingClientRect();
  const element = document.createElement("span");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  element.style.left = `${box.left + box.width / 2}px`;
  element.style.top = `${box.top + box.height / 2}px`;
  document.body.append(element);
  return element;
}

/**
 * M-06. Liked: the heart fills from the bottom (CSS), squashes and springs back, and three small hearts float up from
 * it and drift apart. Unliked: the fill drains, the heart deflates with a little wobble and one grey heart sinks away.
 */
export async function likeMotion(icon: Element, liked: boolean) {
  if (prefersReduced()) {
    logMotion("M-06", "reduced", "start");
    return;
  }
  const { animate } = await loadAnimate();
  logMotion("M-06", "full", "start");
  if (liked) {
    animate(icon, { scale: [1, 0.78, 1.18, 0.96, 1], duration: 620, ease: "outQuad" });
    [-9, 2, 10].forEach((drift, index) => {
      const heart = spark(icon, "float-heart");
      heart.style.setProperty("--size", `${[9, 12, 8][index]}px`);
      animate(heart, {
        x: [0, drift],
        y: [0, -30 - index * 8],
        scale: [0.3, 1, 0.7],
        opacity: [0, 1, 0],
        rotate: [0, drift * 2],
        duration: 900,
        delay: 80 + index * 110,
        ease: "outCubic",
        onComplete: () => heart.remove(),
      });
    });
    return;
  }
  animate(icon, { scale: [1, 0.8, 1.05, 1], rotate: [0, -12, 6, 0], duration: 520, ease: "outQuad" });
  const heart = spark(icon, "float-heart");
  heart.dataset.tone = "gone";
  heart.style.setProperty("--size", "10px");
  animate(heart, { y: [0, 18], scale: [0.9, 0.5], opacity: [0.7, 0], duration: 560, ease: "inQuad", onComplete: () => heart.remove() });
}

/**
 * M-07. Saved: the ribbon fills from the top (CSS) as the bookmark is pulled down and settles, with two glints above
 * it. Unsaved: the fill rolls back up as the bookmark lifts off and drops back.
 */
export async function favoriteMotion(icon: Element, saved: boolean) {
  if (prefersReduced()) {
    logMotion("M-07", "reduced", "start");
    return;
  }
  const { animate } = await loadAnimate();
  logMotion("M-07", "full", "start");
  if (!saved) {
    animate(icon, { y: [0, -7, 1, 0], scaleY: [1, 0.86, 1.05, 1], duration: 480, ease: "outQuad" });
    return;
  }
  animate(icon, {
    y: [-9, 3, -1, 0],
    scaleY: [1, 1.22, 0.9, 1],
    scaleX: [1, 0.86, 1.06, 1],
    duration: 620,
    ease: "outQuart",
  });
  [
    { x: -11, y: -13, delay: 120, size: 9 },
    { x: 12, y: -9, delay: 220, size: 7 },
  ].forEach(({ x, y, delay, size }) => {
    const glint = spark(icon, "burst-glint");
    glint.style.setProperty("--size", `${size}px`);
    animate(glint, {
      x: [0, x],
      y: [0, y],
      scale: [0, 1.15, 0],
      rotate: [0, 90],
      duration: 560,
      delay,
      ease: "outQuad",
      onComplete: () => glint.remove(),
    });
  });
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
  // In the personal centre below 1024px the tabs run across, so its pages and their rows come in from the side
  const page = first[0]?.closest<HTMLElement>(".me-main");
  if (page && matchMedia("(max-width: 1023px)").matches) {
    animate(first, { x: [page.dataset.enter === "back" ? -16 : 16, 0], opacity: [0, 1], duration: 250, delay: stagger(40), ease: "outExpo" });
    return;
  }
  animate(first, { y: [12, 0], opacity: [0, 1], duration: 250, delay: stagger(40), ease: "outExpo" });
}
