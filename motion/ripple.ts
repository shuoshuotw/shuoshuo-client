import { prefersReduced } from "./log";

// HeroUI's Button, by the classes its theme gives every one (@heroui/theme button base, pinned at 2.4.26)
const HEROUI_BUTTON = ".z-0.group.overflow-hidden.tap-highlight-transparent";

/**
 * HeroUI's ripple, drawn the same way (a disc of the control's own colour, from where it was pressed, scaling to twice
 * the control's size as it fades, for as long as HeroUI gives it) but run by the Web Animations API. HeroUI's own ran
 * on framer-motion, a JavaScript animation that took the main thread for every frame of every tap, just when the dock,
 * the menu or a page change wanted it. `layer` is where the disc goes when it must be clipped apart from the control.
 */
export function spawnRipple(host: HTMLElement, x: number, y: number, layer: HTMLElement = host) {
  if (prefersReduced()) return;
  const size = Math.max(host.clientWidth, host.clientHeight);
  const duration = Math.min(Math.max(0.01 * size, 0.2), size > 100 ? 0.75 : 0.5) * 1000;
  const disc = document.createElement("span");
  disc.className = "ripple-disc";
  disc.setAttribute("aria-hidden", "true");
  Object.assign(disc.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` });
  layer.append(disc);
  const done = () => disc.remove();
  disc.animate({ transform: ["scale(0)", "scale(2)"], opacity: [0.35, 0] }, { duration, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" }).finished.then(done, done);
}

/** Where a click landed inside `host`, or its middle for a key, which clicks with no pointer. */
export function pressPoint(host: HTMLElement, event: MouseEvent) {
  const box = host.getBoundingClientRect();
  return event.detail === 0 ? { x: box.width / 2, y: box.height / 2 } : { x: event.clientX - box.left, y: event.clientY - box.top };
}

/**
 * Called once (Providers), with HeroUI's own ripple switched off: every HeroUI Button ripples from the click, as it did.
 * On the click, as HeroUI's did, so a finger that starts a scroll on a button does not set one off.
 */
export function installRipples() {
  const click = (event: MouseEvent) => {
    const host = (event.target as Element | null)?.closest?.<HTMLElement>(HEROUI_BUTTON);
    if (!host || host.matches(":disabled, [data-disabled='true']")) return;
    const { x, y } = pressPoint(host, event);
    spawnRipple(host, x, y);
  };
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}
