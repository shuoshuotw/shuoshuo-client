import { prefersReduced } from "./log";

// Not a Select's trigger: its list opens over it on the press and is sized from it then, so it must not be shrinking
const PRESSABLE = "button:not([disabled], [aria-haspopup='listbox']), [role='button']:not([aria-disabled='true']), [role='link'], a.wordmark";

// Past its size and back, so letting go reads as a spring rather than a fade
const BOUNCE: Keyframe[] = [
  { scale: "1.07", offset: 0.36, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
  { scale: "0.98", offset: 0.68, easing: "ease-in-out" },
  { scale: "1" },
];

/** The logo's two red strokes lift off and are written again, the long one a beat behind the short one. */
export function speakLogo(logo: Element) {
  logo.querySelectorAll(".logo-stroke").forEach((stroke, index) =>
    stroke.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1, offset: 0.3 }, { strokeDashoffset: 0 }], {
      duration: 640,
      delay: index * 90,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    }),
  );
}

/**
 * Every control on the page gives under the finger and springs back when let go. It rides the `scale` property, so a
 * magnet's `transform` and HeroUI's ripple are left alone.
 */
export function installPressSpring() {
  if (prefersReduced()) return () => {};
  const held = new Map<HTMLElement, Animation>();

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const control = (event.target as Element).closest<HTMLElement>(PRESSABLE);
    if (!control || held.has(control)) return;
    held.set(control, control.animate([{ scale: "1" }, { scale: "0.9" }], { duration: 120, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }));
    const logo = control.querySelector(".logo");
    if (logo) speakLogo(logo);
  };

  const up = () => {
    for (const [control, press] of held) {
      // From wherever a quick tap left it
      const from = getComputedStyle(control).scale;
      press.cancel();
      control.animate([{ scale: from === "none" ? "1" : from }, ...BOUNCE], { duration: 520 });
    }
    held.clear();
  };

  addEventListener("pointerdown", down, { capture: true, passive: true });
  addEventListener("pointerup", up, { capture: true, passive: true });
  addEventListener("pointercancel", up, { capture: true, passive: true });
  return () => {
    removeEventListener("pointerdown", down, { capture: true });
    removeEventListener("pointerup", up, { capture: true });
    removeEventListener("pointercancel", up, { capture: true });
  };
}
