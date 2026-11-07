import { logMotion, prefersReduced } from "./log";

// Every GSAP move lives here (§13.1). Dynamic import keeps it out of the first load.
const loadGsap = () => import("gsap").then((module) => module.gsap);

const clearProps = "transform,opacity,filter,clipPath";

let running: { finish: () => void } | null = null;

/** Starts fetching GSAP before the first M-01 needs it, alongside the font. */
export function preloadPick() {
  void loadGsap().catch(() => {});
}

/** Ends whatever M-01 is in progress and leaves its type readable. */
export function stopPicking() {
  running?.finish();
  running = null;
}

/** The logo's two red strokes, riding just after the character being spoken. It takes no width, so nothing rewraps. */
function makeCaret() {
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  return caret;
}

/**
 * M-01: the quote is spoken in. Each character comes from blur to sharp behind a red caret, the brackets close in
 * on the sentence and the credit follows. On a later draw the brackets are already gliding to their new corners
 * (moveBrackets), so `brackets: false` leaves them to it. `onReady` runs once every part holds its starting state, so
 * the caller can stop hiding the type without it showing whole for a frame first. Resolves true if it ran to its end.
 */
export async function pickType(root: HTMLElement, { brackets = true, onReady = () => {} } = {}): Promise<boolean> {
  stopPicking();
  const chars = [...root.querySelectorAll<HTMLElement>("[data-char]")];
  const frame = [...root.querySelectorAll<HTMLElement>(brackets ? ".bracket, .credit" : ".credit")];
  if (prefersReduced()) {
    logMotion("M-01", "reduced", "start");
    const animation = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-in-out" });
    onReady();
    await animation.finished.catch(() => {});
    logMotion("M-01", "reduced", "end");
    return true;
  }

  const gsap = await loadGsap();
  logMotion("M-01", "full", "start");
  const caret = makeCaret();
  return new Promise((resolve) => {
    // Over 40 characters, whole lines come in together: a stagger per character would outrun the budget
    const lines = new Map<number, HTMLElement[]>();
    for (const char of chars) lines.set(char.offsetTop, [...(lines.get(char.offsetTop) ?? []), char]);
    const groups = chars.length > 40 ? [...lines.values()] : chars.map((char) => [char]);
    const each = Math.min(0.045, 0.9 / Math.max(groups.length, 1));
    // A phone repaints every blurred glyph each frame, so there the characters only rise and fade in
    const blur = matchMedia("(pointer: fine)").matches ? 10 : 0;
    const done = () => {
      gsap.set([...chars, ...frame], { clearProps });
      caret.classList.add("caret-rest");
      setTimeout(() => caret.remove(), 1400);
    };

    const timeline = gsap.timeline({
      onComplete: () => {
        done();
        running = null;
        logMotion("M-01", "full", "end");
        resolve(true);
      },
    });
    if (brackets) {
      timeline.fromTo(
        root.querySelectorAll(".bracket-open"),
        { x: "1.2em", y: "0.8em", opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: "expo.out" },
        0,
      );
      timeline.fromTo(
        root.querySelectorAll(".bracket-close"),
        { x: "-1.2em", y: "-0.8em", opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: "expo.out" },
        0,
      );
    }
    groups.forEach((group, index) => {
      timeline.fromTo(
        group,
        { opacity: 0, y: "0.18em", filter: `blur(${blur}px)` },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "expo.out",
          onStart: () => group.at(-1)?.after(caret),
        },
        0.08 + index * each,
      );
    });
    // The credit is written out from left to right, the way the line under it reads
    timeline.fromTo(
      root.querySelectorAll(".credit"),
      { opacity: 0, x: -12, clipPath: "inset(0% 100% 0% 0%)" },
      { opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "expo.out" },
      ">-0.3",
    );
    onReady();
    running = {
      finish: () => {
        timeline.kill();
        done();
        logMotion("M-01", "full", "end");
        resolve(false);
      },
    };
  });
}

/**
 * The leaving half of M-01: the sentence and its credit blur away while the brackets stay to receive the next one.
 * Returns a function that puts them back when the next one is ready.
 */
export function dropType(root: HTMLElement): () => void {
  stopPicking();
  if (prefersReduced()) return () => {};
  const leave = { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" } as const;
  const animations = [
    ...[...root.querySelectorAll(".quote")].map((quote) =>
      quote.animate(
        [
          { opacity: 1, transform: "none", filter: "blur(0px)" },
          { opacity: 0, transform: "translateY(-6px)", filter: "blur(8px)" },
        ],
        leave,
      ),
    ),
    // The credit is taken back from right to left
    ...[...root.querySelectorAll(".credit")].map((credit) =>
      credit.animate(
        [
          { opacity: 1, transform: "none", clipPath: "inset(0% 0% 0% 0%)" },
          { opacity: 0, transform: "translateX(-12px)", clipPath: "inset(0% 100% 0% 0%)" },
        ],
        leave,
      ),
    ),
  ];
  return () => animations.forEach((animation) => animation.cancel());
}

/** Where each bracket stands now, measured against `root` so a scroll in between changes nothing. */
export function bracketCorners(root: HTMLElement) {
  const base = root.getBoundingClientRect();
  return [...root.querySelectorAll(".bracket")].map((bracket) => {
    const box = bracket.getBoundingClientRect();
    return { x: box.left - base.left, y: box.top - base.top };
  });
}

/** The brackets glide from where they stood around the last sentence to the corners of the new one (FLIP). */
export function moveBrackets(root: HTMLElement, from: { x: number; y: number }[]) {
  if (prefersReduced()) return;
  const spring = getComputedStyle(document.documentElement).getPropertyValue("--ease-spring").trim() || "ease-out";
  bracketCorners(root).forEach((to, index) => {
    const start = from[index];
    const bracket = root.querySelectorAll(".bracket")[index];
    if (!start || !bracket) return;
    const dx = start.x - to.x;
    const dy = start.y - to.y;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    bracket.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 760, easing: spring });
  });
}
