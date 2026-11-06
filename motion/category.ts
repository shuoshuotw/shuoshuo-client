import type { CategoryKey } from "@/lib/categories";
import { logMotion, prefersReduced } from "./log";

type Move = { frames: Keyframe[]; duration: number; origin?: string };

const SPRING = "cubic-bezier(0.34, 1.36, 0.64, 1)";

// Each category's icon has a move of its own, drawn from what it pictures
const MOVES: Record<CategoryKey, Move> = {
  // A channel flips: the screen collapses to a line and opens on the new picture
  anime: {
    duration: 560,
    frames: [{ transform: "none" }, { transform: "scale(1.1, 0.12)", offset: 0.3 }, { transform: "scale(0.94, 1.12)", offset: 0.6 }, { transform: "none" }],
  },
  // A page turns over
  manga: { duration: 720, frames: [{ transform: "perspective(48px) rotateY(0deg)" }, { transform: "perspective(48px) rotateY(-360deg)" }] },
  // Thumbs mash the buttons
  game: {
    duration: 520,
    frames: [
      { transform: "none" },
      { transform: "translateX(-2px) rotate(-12deg)", offset: 0.2 },
      { transform: "translateX(2px) rotate(10deg)", offset: 0.4 },
      { transform: "translateX(-1px) rotate(-7deg)", offset: 0.6 },
      { transform: "translateX(1px) rotate(4deg)", offset: 0.8 },
      { transform: "none" },
    ],
  },
  // Two hops on the beat
  music: {
    duration: 720,
    frames: [
      { transform: "none" },
      { transform: "translateY(-6px) rotate(-10deg)", offset: 0.25 },
      { transform: "translateY(0) scale(1.12, 0.88)", offset: 0.45 },
      { transform: "translateY(-3px) rotate(8deg)", offset: 0.7 },
      { transform: "none" },
    ],
  },
  // The books lean on each other and right themselves
  literature: {
    duration: 660,
    origin: "50% 100%",
    frames: [{ transform: "none" }, { transform: "skewX(-16deg)", offset: 0.3 }, { transform: "skewX(9deg)", offset: 0.6 }, { transform: "skewX(-3deg)", offset: 0.82 }, { transform: "none" }],
  },
  // The nib writes a short stroke
  original: {
    duration: 680,
    frames: [
      { transform: "none" },
      { transform: "translate(-3px, 2px) rotate(-14deg)", offset: 0.25 },
      { transform: "translate(2px, -1px) rotate(6deg)", offset: 0.5 },
      { transform: "translate(-1px, 2px) rotate(-8deg)", offset: 0.75 },
      { transform: "none" },
    ],
  },
  // The clapper snaps shut
  flim: {
    duration: 520,
    origin: "20% 80%",
    frames: [{ transform: "none" }, { transform: "rotate(-18deg)", offset: 0.35 }, { transform: "rotate(4deg) scale(1.08, 0.92)", offset: 0.55 }, { transform: "none" }],
  },
  // A feather drifts down, swaying
  poetry: {
    duration: 960,
    frames: [
      { transform: "none" },
      { transform: "translate(3px, -6px) rotate(16deg)", offset: 0.25 },
      { transform: "translate(-3px, -3px) rotate(-12deg)", offset: 0.55 },
      { transform: "translate(1px, 0) rotate(5deg)", offset: 0.8 },
      { transform: "none" },
    ],
  },
  // The globe turns once
  internet: { duration: 820, frames: [{ transform: "perspective(48px) rotateY(0deg)" }, { transform: "perspective(48px) rotateY(360deg)" }] },
  // A thought swells twice
  philosophy: {
    duration: 720,
    frames: [{ transform: "none" }, { transform: "scale(1.2)", offset: 0.25 }, { transform: "scale(0.94)", offset: 0.5 }, { transform: "scale(1.1)", offset: 0.72 }, { transform: "none" }],
  },
  // The jaw chatters
  "anti-motiv": {
    duration: 560,
    frames: [
      { transform: "none" },
      { transform: "translateY(-2px) rotate(-9deg)", offset: 0.18 },
      { transform: "translateY(1px) rotate(9deg)", offset: 0.36 },
      { transform: "translateY(-2px) rotate(-7deg)", offset: 0.54 },
      { transform: "translateY(0) rotate(5deg)", offset: 0.72 },
      { transform: "none" },
    ],
  },
  // The robot beeps: a blink and a tilt of the head
  ai: {
    duration: 640,
    frames: [
      { transform: "none", opacity: 1 },
      { transform: "scale(1.14) rotate(-10deg)", opacity: 1, offset: 0.3 },
      { transform: "scale(1.14, 0.8) rotate(-10deg)", opacity: 0.55, offset: 0.42 },
      { transform: "scale(1.06) rotate(6deg)", opacity: 1, offset: 0.62 },
      { transform: "none", opacity: 1 },
    ],
  },
  // The shapes tumble over
  other: { duration: 700, frames: [{ transform: "none" }, { transform: "rotate(200deg) scale(0.82)", offset: 0.6 }, { transform: "rotate(360deg)" }] },
};

/**
 * M-20: a category's icon performs its own move, when the category is chosen and when a quote of it opens. Read off the
 * icon's data-category (CategoryIcon), so any icon on the page can be handed over.
 */
export function categoryMotion(icon: Element | null | undefined) {
  const key = icon?.getAttribute("data-category") as CategoryKey | null | undefined;
  const move = key ? MOVES[key] : undefined;
  if (!icon || !move) return;
  if (prefersReduced()) {
    logMotion("M-20", "reduced", "start");
    return;
  }
  logMotion("M-20", "full", "start");
  for (const running of icon.getAnimations()) running.cancel();
  (icon as SVGElement).style.transformOrigin = move.origin ?? "50% 50%";
  icon.animate(move.frames, { duration: move.duration, easing: move.frames.length > 2 ? "cubic-bezier(0.33, 1, 0.68, 1)" : SPRING });
}
