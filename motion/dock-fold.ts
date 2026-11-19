import { prefersReduced } from "./log";

// What moves as one piece in a bar; a bar's own controls and the rules between them otherwise. Left out, a rule stayed
// where it stood as the controls around it slid away
const MOVERS = ".draw-wrap, .nav-pill, .toolbar-gap, :is(button, a):not(.draw-wrap *)";
// What the folded bar has no room for
const FADERS = ".toolbar-draw-label, .count, .route-tab-label, .draw-sheen";
// The slot's own timing, both ways, as when its width and its place were tweened: the dock's spring over 540 ms, what
// the folded bar has no room for fading in 220
const MOVE_MS = 540;
const FADE: KeyframeAnimationOptions = { duration: 220, easing: "ease-out", fill: "both" };
// A control the folded bar has no room for at all leaves sight at once, and comes back only once the face has grown
// out past it
const GONE: KeyframeAnimationOptions = { duration: 120, easing: "ease-out", fill: "both" };
const BACK: KeyframeAnimationOptions = { duration: 160, delay: 120, easing: "ease-out", fill: "both" };

// One piece's move: what it animates, its value in the open layout and in the folded one, and its timing
type Move = { target: Element; property: string; pseudoElement?: string; open: string; folded: string; timing: KeyframeAnimationOptions; animation: Animation };
type Flight = { moves: Move[]; compact: boolean; land: () => void };
const flights = new WeakMap<HTMLElement, Flight>();

const length = (move: Move) => Number(move.timing.duration) || 0;

/** Lands the flight when the longest of its moves is over. */
function landOnLast(flight: Flight) {
  const last = flight.moves.reduce<Move | undefined>((longest, move) => (!longest || length(move) > length(longest) ? move : longest), undefined);
  if (last) last.animation.onfinish = flight.land;
  else flight.land();
}

/**
 * Turned round in the air: every piece sets off from where it is now toward the other end, on the move's own timing,
 * as a CSS transition would. Played backwards instead, a spring ran its curve in reverse: slow where it should be
 * quick, and out of step with the bar beside it, which a slow, wavering scroll turned round again and again.
 */
function turn(flight: Flight, compact: boolean) {
  flight.compact = compact;
  for (const move of flight.moves) {
    const now = getComputedStyle(move.target, move.pseudoElement ?? null).getPropertyValue(move.property) || (compact ? move.open : move.folded);
    move.animation.onfinish = null;
    move.animation.cancel();
    move.animation = move.target.animate({ [move.property]: [now, compact ? move.folded : move.open] }, { ...move.timing, pseudoElement: move.pseudoElement });
  }
  landOnLast(flight);
}

const px = (x: number, y = 0) => `${x.toFixed(2)}px ${y.toFixed(2)}px`;

/**
 * Folds the bar a page has put in the dock's slot, or opens it out, without laying anything out on the way. A bar
 * changing size on every frame (its width, its labels narrowing away, its gaps) kept the main thread at some 40 frames
 * a second on a 120 Hz phone, and nothing a phone's compositor runs by itself changes a box's size. So both layouts are
 * measured first, the bar stays in its open layout for the whole move, and every piece is carried between its two
 * places by a transform or an opacity: the controls slide, what the folded bar has no room for fades, and the bar's
 * face is drawn by .dock-face (two rounded boxes clipping each other, so it narrows with both ends round). The folded
 * layout is put in place when the move is over, where it changes nothing in sight.
 */
export function foldSlot(dock: HTMLElement, compact: boolean) {
  const lay = (value: boolean) => {
    if (dock.dataset.compact !== String(value)) dock.dataset.compact = String(value);
  };
  const flying = flights.get(dock);
  if (flying) {
    if (flying.compact !== compact) turn(flying, compact);
    return;
  }
  const bar = dock.querySelector<HTMLElement>(".dock-slot > *");
  if (!bar || prefersReduced() || (dock.dataset.compact === "true") === compact) return lay(compact);

  // The categories' bar only rides down and up as a whole: what it shows is its own body's doing (DockCases)
  const whole = bar.matches(".dock-cases");
  const pieces = whole ? [] : [...bar.querySelectorAll<HTMLElement>(MOVERS)];
  const current = bar.querySelector<HTMLElement>("[aria-current='page']");
  // A sliding pill is placed a frame late (useSlidingPill); the tab it sits under says where it is
  const boxOf = (piece: HTMLElement) => (piece.matches(".nav-pill") && current ? current : piece).getBoundingClientRect();
  // What clips each piece: the bar, or a scroller inside it (the personal centre's tabs)
  const clips = pieces.map((piece) => {
    let node = piece.parentElement;
    while (node && node !== bar && getComputedStyle(node).overflowX === "visible") node = node.parentElement;
    return node ?? bar;
  });
  const measure = () => ({
    bar: bar.getBoundingClientRect(),
    pieces: pieces.map(boxOf),
    clips: clips.map((clip) => clip.getBoundingClientRect()),
    icon: bar.querySelector(".draw-icon")?.getBoundingClientRect(),
  });
  lay(true);
  const folded = measure();
  lay(false);
  const open = measure();
  const frame = dock.getBoundingClientRect();

  const spring = getComputedStyle(document.documentElement).getPropertyValue("--ease-spring").trim() || "ease-out";
  const timing: KeyframeAnimationOptions = { duration: MOVE_MS, easing: spring, fill: "both" };
  const moves: Move[] = [];
  // Each piece from its open place to its folded one, or back; `keyframes` gives each property's [open, folded]
  const move = (target: Element, keyframes: PropertyIndexedKeyframes, pseudoElement?: string, own = timing) => {
    for (const [property, values] of Object.entries(keyframes)) {
      const [open, folded] = values as [string, string];
      const animation = target.animate({ [property]: compact ? [open, folded] : [folded, open] }, { ...own, pseudoElement });
      moves.push({ target, property, pseudoElement, open, folded, timing: own, animation });
    }
  };

  // The bar is carried as a whole and its pieces within it, so a bar that clips what it holds (the profile's tabs)
  // keeps them in sight on the way: moved by themselves, they left its box as it rode down into the dock's row
  const shift = { x: folded.bar.left - open.bar.left, y: folded.bar.top - open.bar.top };
  move(bar, { translate: [px(0), px(shift.x, shift.y)] });
  const hidden = (box: DOMRect) => box.width === 0 && box.height === 0;
  pieces.forEach((piece, index) => {
    const from = open.pieces[index]!;
    const to = folded.pieces[index]!;
    // A piece one of the two layouts hides (the rules a folded quote's toolbar drops) fades where it stands: it has no
    // place to travel to, and sent toward an empty box it flew off to the screen's corner
    if (hidden(from) || hidden(to)) {
      if (!(hidden(from) && hidden(to))) move(piece, { opacity: [hidden(from) ? "0" : "1", hidden(to) ? "0" : "1"] }, undefined, GONE);
      return;
    }
    move(piece, { translate: [px(0), px(to.left - from.left - shift.x, to.top - from.top - shift.y)] });
    // A pill under a tab that loses its name narrows as the pages' bar's face does
    if (piece.matches(".nav-pill") && Math.abs(to.width - from.width) > 0.5) move(piece, { translate: [px(0), px(to.width - from.width)] }, "::before");
    if (!piece.matches(".draw-wrap")) return;
    // The draw button narrows to a circle about its icon: its face slides out under the button's own round clip,
    // the glow under it narrows, and the icon takes the middle
    const face = piece.querySelector(".draw-face");
    if (face) move(face, { translate: [px(0), px(to.width - from.width)] });
    const glow = (to.width - 24) / Math.max(1, from.width - 24);
    move(piece, { scale: ["1 1", `${glow.toFixed(4)} 1`], translate: [px(0), px(((from.width - 24) * (glow - 1)) / 2)] }, "::before");
    const icon = piece.querySelector(".draw-icon");
    if (icon && open.icon && folded.icon) move(icon, { translate: [px(0), px(folded.icon.left - to.left - (open.icon.left - from.left))] });
  });
  // A control the folded bar clips, wholly or in part (the personal centre's last tabs), fades as the fold begins and
  // comes back late as it opens. The bar keeps its open box on the way, so carried to its folded place it showed past
  // the narrowing face, over the dock's other buttons, until the folded layout clipped it at the end
  pieces.forEach((piece, index) => {
    const to = folded.pieces[index]!;
    const clip = folded.clips[index]!;
    if (piece.matches(".nav-pill") || hidden(to) || hidden(open.pieces[index]!)) return;
    if (to.left < clip.left - 1 || to.right > clip.right + 1) move(piece, { opacity: ["1", "0"] }, undefined, compact ? GONE : BACK);
  });
  if (!whole) for (const fader of bar.querySelectorAll(FADERS)) move(fader, { opacity: ["1", "0"] }, undefined, FADE);

  // The bar's face, for a bar that is the dock's plain pill both open and folded
  const face = dock.querySelector<HTMLElement>(".dock-face");
  if (face && !whole && Math.abs(open.bar.height - 56) < 1 && Math.abs(folded.bar.height - 56) < 1) {
    const place = (box: DOMRect) => ({ outer: px(box.left - frame.left, box.top - frame.top), inner: px(box.right - frame.right - (box.left - frame.left)) });
    const from = place(open.bar);
    const to = place(folded.bar);
    for (const clip of face.children) {
      move(clip, { translate: [from.outer, to.outer] });
      move(clip.firstElementChild!, { translate: [from.inner, to.inner] });
    }
    dock.dataset.folding = "";
  }

  const flight: Flight = {
    moves,
    compact,
    land: () => {
      if (flights.get(dock) !== flight) return;
      flights.delete(dock);
      // The layout it was heading for and the end of the move, in one frame
      lay(flight.compact);
      delete dock.dataset.folding;
      delete dock.dataset.flying;
      for (const { animation } of moves) animation.cancel();
      // A sliding pill is placed in the new layout later in this frame, and takes that place at once
      dock.dataset.landed = "";
      requestAnimationFrame(() => requestAnimationFrame(() => delete dock.dataset.landed));
    },
  };
  flights.set(dock, flight);
  dock.dataset.flying = "";
  // Landed when the longest of them is over (the labels' fade ends well before the spring)
  landOnLast(flight);
}
