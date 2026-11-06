import { logMotion, prefersReduced } from "./log";
import { springEase } from "./spring";

// M-04. Opening, a gentle start and a long, soft landing: the card leaves its origin without a jump and settles without
// a bump. Closing eases in and out, so it lands in its origin instead of creeping the last stretch
const OPEN_MS = 520;
const CLOSE_MS = 380;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const CLOSE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
// At either end the card and what it grew out of cross over in place
const CROSS_MS = 140;
// Reduced motion: the card only fades in and out where it stands
const FADE_MS = 180;

export type MorphParts = { dialog: HTMLDialogElement; card: HTMLElement; inner: HTMLElement; scrim: HTMLElement; origin: HTMLElement };

const running = new WeakMap<HTMLDialogElement, Animation[]>();

/** A box as the card can take it on: its place and size, its corners (a pill's no rounder than half its height) and its colours. */
function surface(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const radius = Math.min(Number.parseFloat(style.borderTopLeftRadius) || 0, box.width / 2, box.height / 2);
  return {
    transform: `translate(${box.left}px, ${box.top}px)`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: `${radius}px`,
    backgroundColor: style.backgroundColor,
    borderColor: style.borderTopColor,
  };
}

/** Ends whatever is still moving and hands the card back to its stylesheet. */
function settle({ dialog, inner }: MorphParts) {
  for (const animation of running.get(dialog) ?? []) animation.cancel();
  running.delete(dialog);
  delete dialog.dataset.morphing;
  inner.style.removeProperty("width");
}

/**
 * The contents keep their open width while the card around them changes, so no line rewraps and no scrollbar shows.
 * Their height stays their own: what arrives while the card grows (comments in place of their skeleton) is still laid
 * out at its real size, and the card takes it up once it has landed.
 */
function freeze({ dialog, inner }: MorphParts) {
  if (dialog.dataset.morphing) return;
  inner.style.width = `${inner.offsetWidth}px`;
  dialog.dataset.morphing = "true";
}

function track(dialog: HTMLDialogElement, animations: Animation[]) {
  running.set(dialog, animations);
  // A cancelled run (the other direction took over) rejects; that one is already settled by whoever cancelled it
  return Promise.all(animations.map((animation) => animation.finished)).then(
    () => true,
    () => false,
  );
}

/**
 * While the dialog is open its card eases to the height of what is in it (transitions-dev card resize): a field that
 * comes with a choice, a warning in its place. The contents are watched, not the card, so the card's own animations
 * never read as a change; the morphs size the card themselves. Returns the way to stop.
 */
export function followContents({ dialog, card, inner }: Pick<MorphParts, "dialog" | "card" | "inner">) {
  let last = inner.offsetHeight;
  let resizing: Animation | null = null;
  const observer = new ResizeObserver(() => {
    const now = inner.offsetHeight;
    const change = now - last;
    last = now;
    if (!dialog.open || dialog.dataset.morphing || Math.abs(change) <= 1 || prefersReduced()) return;
    // From wherever a resize still under way has it, or from its height before the change
    const shown = card.getBoundingClientRect().height;
    resizing?.cancel();
    const to = card.offsetHeight;
    const from = resizing ? shown : to - change;
    resizing = card.animate({ height: [`${from}px`, `${to}px`] }, { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    const ended = resizing;
    ended.onfinish = () => {
      if (resizing === ended) resizing = null;
    };
  });
  observer.observe(inner);
  return () => observer.disconnect();
}

/**
 * Grows the card out of its origin (the bar, the card or the button it was opened from): the card starts as that box,
 * in its colours and corners, and turns into itself on the way to its place; it fades in over the origin as the origin
 * fades out, and its contents come in once it has room. The backdrop darkens alongside. `show` opens the <dialog>.
 */
export async function openMorph(parts: MorphParts, show: () => void) {
  const { dialog, card, inner, scrim, origin } = parts;
  settle(parts);
  // Centred on the screen when it opens, then kept at that top while its contents grow or shrink below it. Reduced
  // motion too: without it the card stood at the top of the screen
  dialog.style.setProperty("--card-top", "24px");
  dialog.style.setProperty("--card-top", `${Math.max(24, (innerHeight - card.offsetHeight) / 2)}px`);
  // Reduced: the card and the backdrop only fade in where the card stands
  if (prefersReduced()) {
    logMotion("M-04", "reduced", "start");
    show();
    origin.dataset.morphOpen = "true";
    void track(dialog, [
      card.animate({ opacity: [0, 1] }, { duration: FADE_MS, easing: "ease-out" }),
      scrim.animate({ opacity: [0, 1] }, { duration: FADE_MS, easing: "ease-out" }),
    ]);
    return;
  }
  const from = surface(origin);
  // The dialog opens once the card has landed; the closed dialog is laid out above the page all the while, so the card
  // grows over it just the same.
  const to = surface(card);
  freeze(parts);
  logMotion("M-04", "full", "start");
  const done = await track(dialog, [
    card.animate([from, to], { duration: OPEN_MS, easing: EASE, fill: "forwards" }),
    card.animate({ opacity: [0, 1] }, { duration: CROSS_MS, easing: "linear", fill: "forwards" }),
    origin.animate({ opacity: [1, 0] }, { duration: CROSS_MS, easing: "linear", fill: "forwards" }),
    inner.animate({ opacity: [0, 1] }, { duration: 280, delay: 170, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }),
    scrim.animate({ opacity: [0, 1] }, { duration: OPEN_MS, easing: EASE, fill: "forwards" }),
  ]);
  if (!done) return;
  if (!dialog.open) show();
  origin.dataset.morphOpen = "true";
  // Contents that grew or shrank on the way (they arrived during the morph) are taken up by the card with a spring
  // from the height it landed at, not in one jump
  const landed = card.getBoundingClientRect().height;
  settle(parts);
  const height = card.getBoundingClientRect().height;
  if (Math.abs(height - landed) > 1) void track(dialog, [card.animate({ height: [`${landed}px`, `${height}px`] }, springEase(380, 34))]);
}

/**
 * The way back: the contents go first, the card shrinks into the origin's box and colours from wherever it is (also
 * halfway through opening), and over the last moment the origin fades in under it as it fades out. `hide` closes the
 * <dialog> once the card has landed.
 */
export async function closeMorph(parts: MorphParts, hide: () => void) {
  const { dialog, card, inner, scrim, origin } = parts;
  if (prefersReduced()) {
    const shown = getComputedStyle(scrim).opacity;
    settle(parts);
    const faded = await track(dialog, [
      card.animate({ opacity: [1, 0] }, { duration: FADE_MS, easing: "ease-in", fill: "forwards" }),
      scrim.animate({ opacity: [shown, "0"] }, { duration: FADE_MS, easing: "ease-in", fill: "forwards" }),
    ]);
    if (!faded) return;
    hide();
    delete origin.dataset.morphOpen;
    settle(parts);
    return;
  }
  // Read before anything stops, so an open still under way turns round where it is
  const from = surface(card);
  const shown = { inner: getComputedStyle(inner).opacity, scrim: getComputedStyle(scrim).opacity };
  const frozen = dialog.dataset.morphing ? inner.style.width : null;
  settle(parts);
  delete origin.dataset.morphOpen;
  const to = surface(origin);
  if (frozen) inner.style.width = frozen;
  freeze(parts);
  const done = await track(dialog, [
    card.animate([from, to], { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "forwards" }),
    inner.animate({ opacity: [shown.inner, "0"] }, { duration: 120, easing: "ease-out", fill: "forwards" }),
    card.animate({ opacity: [1, 0] }, { duration: CROSS_MS, delay: CLOSE_MS - CROSS_MS, easing: "linear", fill: "both" }),
    origin.animate({ opacity: [0, 1] }, { duration: CROSS_MS, delay: CLOSE_MS - CROSS_MS, easing: "linear", fill: "backwards" }),
    scrim.animate({ opacity: [shown.scrim, "0"] }, { duration: CLOSE_MS, easing: CLOSE_EASE, fill: "forwards" }),
  ]);
  if (!done) return;
  hide();
  settle(parts);
}
