import { prefersReduced } from "./log";

// The new page has this long to arrive before the picture of the old one lets go. The screen stands still meanwhile,
// so it is kept short: a page that takes longer simply arrives without the sentence travelling
export const WAIT_MS = 700;

/**
 * What was tapped gives at once (styles: [data-pressing]), before the picture of the old page is taken: the screen
 * stands still from then until the new page is ready, and a press that showed nothing read as a tap that had missed.
 * Returns the way to let go.
 */
export function press(target: HTMLElement | null) {
  if (!target) return () => {};
  target.dataset.pressing = "true";
  return () => delete target.dataset.pressing;
}

/**
 * The pages these links open are fetched from the press itself, not from the click that follows it: a finger takes a
 * tenth of a second between the two, a mouse longer, and the wait under the transition is shorter by that much.
 */
export function installWarmUp(prefetch: (href: string) => void) {
  const down = (event: PointerEvent) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>("a[data-quote-id], a[data-profile]");
    const href = link?.getAttribute("href");
    if (href) prefetch(href);
  };
  document.addEventListener("pointerdown", down, { capture: true, passive: true });
  return () => document.removeEventListener("pointerdown", down, true);
}

/** The sentence a quote link stands for: the link itself, or the sentence on the card it sits on. */
export function quoteTextOf(link: HTMLElement) {
  return link.matches("[data-quote-text]") ? link : (link.closest(".quote-row-item, .fan-card")?.querySelector<HTMLElement>("[data-quote-text]") ?? null);
}

/**
 * Opening a quote from anywhere it is shown (a card, a ranked row, the fan) is one shared-element view transition: the
 * sentence that was clicked travels and grows into the detail page's sentence while everything else crossfades. The
 * detail page names its own parts in CSS. A link takes part by carrying data-quote-id. With reduced motion (asked at
 * each click, so switching it on takes effect at once) nothing travels: the two pages crossfade.
 */
export function installQuoteMorph(push: (href: string) => void) {
  if (!document.startViewTransition) return () => {};

  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-quote-id]");
    if (!link || link.target === "_blank") return;
    const id = link.dataset.quoteId!;
    const text = quoteTextOf(link);
    if (!text) return;
    event.preventDefault();
    if (!prefersReduced()) text.style.viewTransitionName = "quote-text";
    const release = press(link.closest<HTMLElement>(".quote-row-item, .fan-card") ?? link);

    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          // The old picture is taken; the name goes to the new page's sentence
          text.style.viewTransitionName = "";
          push(link.getAttribute("href")!);
          const start = performance.now();
          // Rendering is held during the transition, so no animation frame comes to poll with
          const arrived = () => {
            if (document.querySelector(`.detail-stage[data-quote-id="${id}"]`) || performance.now() - start > WAIT_MS) resolve();
            else setTimeout(arrived, 16);
          };
          arrived();
        }),
    );
    void transition.finished.finally(release);
  };

  // Before Next's Link sees the click: a prevented click is one it leaves alone
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}
