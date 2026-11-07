import { prefersReduced } from "./log";

// The new page has this long to arrive before the picture of the old one lets go
const WAIT_MS = 1500;

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

    document.startViewTransition(
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
  };

  // Before Next's Link sees the click: a prevented click is one it leaves alone
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}
