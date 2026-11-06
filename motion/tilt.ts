import { prefersReduced } from "./log";

// How far a card sinks toward the mouse, in degrees
const TILT = 6;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Any quote card under the mouse sinks on the side the pointer is on and the light falls where it is (Tilt Card),
 * on every page. One listener for the whole site, so a list that grows needs nothing of its own. The light stays
 * where it last fell (--gx, --gy) while it fades.
 */
export function installCardTilt() {
  if (!matchMedia("(pointer: fine)").matches || prefersReduced()) return () => {};
  let card: HTMLElement | null = null;

  const settle = () => {
    if (!card) return;
    delete card.dataset.tilt;
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    card = null;
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const next = (event.target as Element).closest<HTMLElement>(".quote-card");
    if (next !== card) settle();
    if (!next) return;
    const box = next.getBoundingClientRect();
    const nx = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1);
    const ny = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1);
    next.style.setProperty("--rx", `${-ny * TILT}deg`);
    next.style.setProperty("--ry", `${nx * TILT}deg`);
    next.style.setProperty("--gx", `${((nx + 1) / 2) * 100}%`);
    next.style.setProperty("--gy", `${((ny + 1) / 2) * 100}%`);
    next.dataset.tilt = "true";
    card = next;
  };

  addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", settle);
  return () => {
    removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", settle);
    settle();
  };
}
