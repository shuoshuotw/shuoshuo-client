// The corner radius of the dock's boxes (a bar 56px high is a pill), and how far each clip reaches past the box so a
// spring carrying the shape a little beyond it is not cut off (styles: --pad)
const RADIUS = 28;
const PAD = 64;
const ID = "morph-box";

/** A rectangle inside a morph box, from the box's own top left corner. */
export type Rect = { x: number; y: number; w: number; h: number };

// A move and a scale as two functions, which are tweened each by itself. As one matrix, a band scaled down to nothing
// (the line's, when the shape is a bar) cannot be taken apart to be tweened, and stood still until half way, then jumped
const matrix = (a: number, d: number, e: number, f: number) => `translate(${e.toFixed(2)}px, ${f.toFixed(2)}px) scale(${a.toFixed(5)}, ${d.toFixed(5)})`;
const move = (e: number, f: number) => matrix(1, 1, e, f);

// Where each clip's own top left corner stands when the shape is the whole box, from the box's inner corner: each
// reaches PAD past the box on the two sides away from the corner it rounds
const ORIGIN: Record<string, [number, number]> = { tl: [0, 0], tr: [-PAD, 0], br: [-PAD, -PAD], bl: [0, -PAD] };

/**
 * What every piece of a morph box is given for the box to show `rect`. A box that changes size cannot be run by a
 * phone's compositor (width and height are laid out again on every frame), and one stretched by a scale has its round
 * corners go oval, so the box is drawn in pieces that only move:
 * - its line: two bands crossing and a circle in each corner (.mbox-line), together a rounded rectangle of any size;
 * - its inside: four boxes one in another (.mbox-clip), each clipping to a rounded rectangle and each moved so that one
 *   of its corners is one of the shape's. What all four leave in sight is the shape a pixel inside the line, and what
 *   the innermost holds is clipped to it as the old box's overflow clipped it;
 * - its shadows (.mbox-shade): the bar's, and the taller box's coming in as it grows.
 * Every value is linear in the rectangle, so pieces eased alike from one rectangle to another agree all the way.
 */
function pieces(box: HTMLElement, rect: Rect, W: number, H: number) {
  const out: [HTMLElement, { transform: string; opacity?: string }][] = [];
  const r = RADIUS;
  const right = rect.x + rect.w - W;
  const bottom = rect.y + rect.h - H;
  const line: Record<string, string> = {
    across: matrix(rect.w / W, Math.max(0, rect.h - 2 * r) / (H - 2 * r), rect.x, rect.y),
    down: matrix(Math.max(0, rect.w - 2 * r) / (W - 2 * r), rect.h / H, rect.x, rect.y),
    tl: move(rect.x, rect.y),
    tr: move(right, rect.y),
    bl: move(rect.x, bottom),
    br: move(right, bottom),
  };
  for (const part of box.querySelectorAll<HTMLElement>(":scope > .mbox-line > [data-part]")) out.push([part, { transform: line[part.dataset.part!]! }]);

  // The inside is the shape a pixel in: the same offsets, in a box two pixels smaller each way
  const at: Record<string, [number, number]> = { tl: [rect.x, rect.y], tr: [right, rect.y], br: [right, bottom], bl: [rect.x, bottom] };
  let parent: [number, number] = [0, 0];
  for (let clip = box.querySelector<HTMLElement>(":scope > .mbox-clip"); clip; clip = clip.querySelector<HTMLElement>(":scope > .mbox-clip")) {
    const own = at[clip.dataset.corner!]!;
    out.push([clip, { transform: move(own[0] - parent[0], own[1] - parent[1]) }]);
    parent = own;
  }

  // How far the shape has grown from a bar's height toward the whole box's
  const grown = Math.min(1, Math.max(0, (rect.h - 2 * r) / Math.max(1, H - 2 * r)));
  const low = box.querySelector<HTMLElement>(':scope > .mbox-shade[data-shade="low"]');
  if (low) out.push([low, { transform: matrix(rect.w / W, 1, rect.x, bottom), opacity: String(1 - grown) }]);
  const high = box.querySelector<HTMLElement>(':scope > .mbox-shade[data-shade="high"]');
  if (high) out.push([high, { transform: matrix(rect.w / W, rect.h / H, rect.x, rect.y), opacity: String(grown) }]);
  return out;
}

/** Lays the clips out for the box's size: each as big as the box's inside and PAD more, placed by the corner it rounds. */
function fit(box: HTMLElement, W: number, H: number) {
  let parent: [number, number] = [-1, -1];
  for (let clip = box.querySelector<HTMLElement>(":scope > .mbox-clip"); clip; clip = clip.querySelector<HTMLElement>(":scope > .mbox-clip")) {
    const own = ORIGIN[clip.dataset.corner!]!;
    const style = `${own[0] - parent[0]}px|${own[1] - parent[1]}px|${W - 2 + PAD}px|${H - 2 + PAD}px`;
    if (clip.dataset.fit !== style) {
      clip.dataset.fit = style;
      [clip.style.left, clip.style.top, clip.style.width, clip.style.height] = style.split("|") as [string, string, string, string];
    }
    parent = own;
  }
}

/** The rectangle the box shows now, a move under way included, read back from two of its line's corners. */
function rectNow(box: HTMLElement): Rect | null {
  const tl = box.querySelector(':scope > .mbox-line > [data-part="tl"]')?.getBoundingClientRect();
  const br = box.querySelector(':scope > .mbox-line > [data-part="br"]')?.getBoundingClientRect();
  if (!tl || !br) return null;
  const frame = box.getBoundingClientRect();
  return { x: tl.left - frame.left, y: tl.top - frame.top, w: br.right - tl.left, h: br.bottom - tl.top };
}

/** Whether the box is in the middle of a move. */
export const moving = (box: HTMLElement) => box.getAnimations({ subtree: true }).some((animation) => animation.id === ID && animation.playState === "running");

/**
 * Gives a morph box the shape `rect`, at once or along `timing` from the shape it has, a move under way included. Only
 * transforms and opacities move, so the compositor runs all of it.
 */
export function shapeBox(box: HTMLElement, rect: Rect, timing?: KeyframeAnimationOptions) {
  const W = box.offsetWidth;
  const H = box.offsetHeight;
  if (W <= 2 * RADIUS || H <= 2 * RADIUS || !rect.w || !rect.h) return;
  const from = timing ? rectNow(box) : null;
  for (const animation of box.getAnimations({ subtree: true })) if (animation.id === ID) animation.cancel();
  fit(box, W, H);
  const before = from ? new Map(pieces(box, from, W, H)) : null;
  for (const [piece, to] of pieces(box, rect, W, H)) {
    piece.style.transform = to.transform;
    if (to.opacity !== undefined) piece.style.opacity = to.opacity;
    const was = before?.get(piece);
    if (!timing || !was) continue;
    if (was.transform !== to.transform) piece.animate({ transform: [was.transform, to.transform] }, { ...timing, id: ID });
    if (was.opacity !== undefined && was.opacity !== to.opacity) piece.animate({ opacity: [was.opacity, to.opacity!] }, { ...timing, id: ID });
  }
}
