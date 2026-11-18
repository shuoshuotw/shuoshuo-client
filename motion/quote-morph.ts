import { prefersReduced } from "./log";

// The new page has this long to arrive before the picture of the old one lets go, in a transition started here (going
// back: lib/navigation.ts). The screen stands still meanwhile, so it is kept short: a page that takes longer simply
// arrives without the sentence travelling
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

/** Once the frame with what has just changed in it is on the screen. */
export function afterPaint(then: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(then));
}

/**
 * Settles once `found` finds the new page, the moment it is put in (no animation frame comes while a view transition
 * holds rendering, and polling on a timer found it up to a timer's step late), or after `ms` with false.
 */
export function arrival(found: () => boolean, ms: number) {
  return new Promise<boolean>((resolve) => {
    if (found()) return resolve(true);
    const done = (value: boolean) => {
      watch.disconnect();
      clearTimeout(timer);
      resolve(value);
    };
    const watch = new MutationObserver(() => found() && done(true));
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = setTimeout(() => done(found()), ms);
  });
}

// How long a pressed card waits for its page to be made before the move starts all the same
export const READY_MS = 1500;

// Each page a press has asked the server for, and when it was made
const warming = new Map<string, { at: number; done: Promise<void> }>();
// The code fetched ahead for those pages
const fetchedCode = new Set<string>();

/**
 * The code a page needs that this one has not loaded, read off the page's HTML and put in the browser's cache. Left
 * to the move, it was fetched while a view transition held the screen still, and a phone shows the old page without
 * its travelling parts for that long: the sentence blinked out of its card before it set off.
 */
function fetchCode(html: string) {
  const loaded = new Set([...document.scripts].map((script) => script.getAttribute("src")));
  const wanted = [...new Set(html.match(/\/_next\/static\/chunks\/[\w.~-]+\.js/g) ?? [])].filter((src) => !loaded.has(src) && !fetchedCode.has(src));
  for (const src of wanted) fetchedCode.add(src);
  return Promise.all(wanted.map((src) => fetch(src).then((response) => response.arrayBuffer(), () => {})));
}

/**
 * Asks the server for the page `href`, once a minute at most. A quote or a profile no one has opened yet is made on
 * demand, with Core behind it, which took longer than a view transition holds the screen still: the screen froze, the
 * move was given up, and the page then appeared all at once. Made, it is kept, and the move's own fetch of it is quick.
 * The code it needs comes with it (fetchCode).
 */
function warm(href: string) {
  const known = warming.get(href);
  if (known && performance.now() - known.at < 60_000) return known.done;
  const done = fetch(href, { credentials: "same-origin" })
    .then((response) => response.text())
    .then(fetchCode)
    .then(
      () => {},
      () => {},
    );
  warming.set(href, { at: performance.now(), done });
  return done;
}

let latest: { drop: () => void } | null = null;

/**
 * A morph waiting for its page; one still waiting gives way to it, and `drop` (taking its parts' names away, so two
 * parts never share one) runs as it does. Returns whether it is still the latest.
 */
export function claim(drop: () => void = () => {}) {
  latest?.drop();
  const mine = { drop };
  latest = mine;
  return () => latest === mine;
}

/**
 * Settles once the page `href` is made, or after `ms`. A morph waits for this before it starts: meanwhile the old page
 * stays live with what was pressed showing the press, where a transition started at once froze the screen for as
 * long as the server took.
 */
export function ready(href: string, ms = READY_MS) {
  return Promise.race([warm(href), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

/**
 * The pages these links open are fetched from the press itself, not from the click that follows it: a finger takes a
 * tenth of a second between the two, a mouse longer, and the wait before the move is shorter by that much.
 */
export function installWarmUp(prefetch: (href: string) => void) {
  const down = (event: PointerEvent) => {
    const link = (event.target as Element).closest?.<HTMLAnchorElement>("a[data-quote-id], a[data-profile]");
    const href = link?.getAttribute("href");
    if (!href) return;
    prefetch(href);
    void warm(href);
  };
  document.addEventListener("pointerdown", down, { capture: true, passive: true });
  return () => document.removeEventListener("pointerdown", down, true);
}

/**
 * Marks a navigation a view transition carries, so the new page does not also fade itself in (M-12): faded twice, it
 * was still faint when the picture of the old page had all but gone, and the screen dimmed for a moment. Returns the
 * way to unmark it, which first takes the fade off the page for good, or taking the mark away would start it late.
 */
export function morphing() {
  const root = document.documentElement;
  root.dataset.morph = "";
  return () => {
    for (const page of document.querySelectorAll<HTMLElement>(".page-in")) page.style.animation = "none";
    delete root.dataset.morph;
  };
}

/**
 * Carries each named part of a view transition from its old box to its new one by a transform alone, called once its
 * parts are in place. The browser's own move changes the part's width and height as it goes, which only the main
 * thread can do, and the main thread is busy building the new page just then: on a phone the parts stood still at
 * their old places and jumped to the new ones as the transition ended. Here a part keeps its new size and starts scaled
 * down to the old one's width from its top left corner (styles: transform-origin), so the old picture covers its old
 * box exactly and the new one grows out of it; the compositor runs it all. The root, which neither moves nor changes
 * size, is left without a move at all. Returns the moves, to be cancelled with the transition: left holding their last
 * frame they outlived it, and took hold of the next transition's part of the same name (a sentence going back to its
 * card was pinned where the quote's page had it).
 */
function carry() {
  const moves: Animation[] = [];
  for (const animation of document.getAnimations()) {
    const effect = animation.effect as KeyframeEffect | null;
    const pseudo = effect?.pseudoElement ?? "";
    const name = /^::view-transition-group\((.+)\)$/.exec(pseudo)?.[1];
    if (!effect || !name) continue;
    if (name === "root") {
      animation.cancel();
      continue;
    }
    // Where the part ends comes from the browser's own move, its last keyframe. Read off the part's style it was where
    // the move stood just then, and a phone's Chrome is already at its first frame: the sentence stood still on its
    // card for the whole move, then jumped to its page as the move ended
    const frames = effect.getKeyframes();
    const from = frames[0];
    const to = frames.at(-1);
    const scale = Number.parseFloat(String(from?.width)) / Number.parseFloat(String(to?.width));
    // A part this cannot read keeps the browser's own move
    if (!from?.transform || !to?.transform || frames.length < 2 || !Number.isFinite(scale) || scale <= 0) continue;
    const duration = Number(effect.getComputedTiming().duration) || 0;
    animation.cancel();
    const start = new DOMMatrix(String(from.transform)).scale(scale);
    moves.push(document.documentElement.animate({ transform: [start.toString(), String(to.transform)] }, { duration, easing: from.easing ?? "ease", pseudoElement: pseudo }));
  }
  return moves;
}

/** carry() for a view transition started here, as its parts come in, its moves gone with it. */
export function glide(transition: ViewTransition) {
  void transition.ready.then(() => {
    const moves = carry();
    void transition.finished.finally(() => {
      for (const move of moves) move.cancel();
    });
  }, () => {});
}

/** A morph between two pages: what the new page names as it comes in, and what is undone once the move is over. */
export type Morph = {
  /** In the commit that puts the new page in, before its picture is taken: names its parts, and returns them. */
  land: () => HTMLElement[];
  /** Once the move is over, or if none came. */
  done: () => void;
};

type Pending = Morph & { unmark: () => void; landed: HTMLElement[]; moving: boolean };
let pending: Pending | null = null;

/**
 * Begins a morph: `go` navigates, and React starts the view transition itself (MorphMark), once it has made the new
 * page and is about to put it in. Started here instead, the transition held the screen still while React made the
 * page, and a phone shows a page without its named parts for as long as that lasts: the sentence blinked out of its
 * card before it set off. A navigation that brings no transition undoes the morph after a while all the same.
 */
export function beginMorph(morph: Morph, go: () => void) {
  endMorph();
  const mine: Pending = { ...morph, unmark: morphing(), landed: [], moving: false };
  pending = mine;
  setTimeout(() => pending === mine && !mine.moving && endMorph(), 3000);
  go();
}

/** Whether a morph is waiting for its page; read by MorphMark as the new page renders. */
export const morphWaiting = () => pending !== null && !pending.moving;

/** The new page is in (MorphMark, in the commit): its parts are named before their pictures are taken. */
export function landMorph() {
  if (pending && !pending.moving) pending.landed = pending.land();
}

/** The transition is under way (MorphMark): its parts are carried; returns how to end it. */
export function moveMorph() {
  const mine = pending;
  if (mine) mine.moving = true;
  const moves = carry();
  return () => {
    for (const move of moves) move.cancel();
    if (pending === mine) endMorph();
  };
}

function endMorph() {
  const morph = pending;
  pending = null;
  if (!morph) return;
  for (const part of morph.landed) part.style.removeProperty("view-transition-name");
  morph.unmark();
  morph.done();
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
    const text = quoteTextOf(link);
    if (!text) return;
    event.preventDefault();
    const href = link.getAttribute("href")!;
    const release = press(link.closest<HTMLElement>(".quote-row-item, .fan-card") ?? link);
    // The sentence is named at the tap, not as the move starts: named then, it was painted again just as its picture
    // was taken, and a phone took the picture first. The sentence was gone from its card until the move began
    if (!prefersReduced()) text.style.viewTransitionName = "quote-text";
    const current = claim(() => (text.style.viewTransitionName = ""));
    // The page is made first, the old one live and the press showing meanwhile; the press is drawn before the picture
    // is taken (starting a transition restyles the whole page before anything is shown, and the tap looked lost)
    void ready(href).then(() => {
      if (!current()) return release();
      afterPaint(() => beginMorph({ land, done: release }, () => push(href)));
    });
    const land = () => {
      // The old picture is taken; the name goes to the new page's sentence
      text.style.viewTransitionName = "";
      // The quote's page starts at its top, and must be there before its picture is taken: left where the list had
      // been scrolled to, the sentence travelled to the wrong place and the page jumped up half way through
      document.getElementById("app-scroll")?.scrollTo({ top: 0 });
      return [];
    };
  };

  // Before Next's Link sees the click: a prevented click is one it leaves alone
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}
