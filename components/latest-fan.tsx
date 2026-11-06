"use client";

import { Button } from "@heroui/react";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, type PointerEvent, startTransition, useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/api/client";
import { isReturning, recall, remember } from "@/lib/navigation";
import { prefersReduced } from "@/motion/log";
import { CategoryChip } from "./category-icon";
import { LinkButton } from "./link-button";
import { stageSize } from "./quote-row";
import { QuoteCredit } from "./quote-sheet";

const SWAP_MS = 4500;
// How far a pointer travels before a press becomes a drag
const DRAG_PX = 5;
// How far or how fast the front card must be thrown before it goes to the back of the hand (card swap)
const THROW_PX = 120;
const FLING = 0.7;
// How far a card under the mouse sinks toward it
const TILT = 7;

type Drag = { id: number; index: number; x: number; y: number; on: boolean; touch: boolean; dx: number; dy: number; lastX: number; at: number; speed: number };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The shortest way round a hand of `count`, so the card that leaves the front goes to the back. */
function wrap(offset: number, count: number) {
  const turned = (((offset + count / 2) % count) + count) % count - count / 2;
  return Object.is(turned, -0) ? 0 : turned;
}

/**
 * The latest quotes as a hand of cards on an arc. The front card is the one in focus; every few seconds it goes to the
 * back of the hand and the next steps forward. Any card can be picked up and carried anywhere; let go, and it comes to
 * the front. The front card thrown away goes to the back instead. Under the mouse a card sinks toward the pointer. The
 * arrows and the dots step through the hand like a carousel.
 */
export function LatestFan({ quotes }: { quotes: Quote[] }) {
  const section = useRef<HTMLElement>(null);
  const fan = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const swiped = useRef(false);
  const tilted = useRef<HTMLElement | null>(null);
  // Returned to from a quote, the hand is spread with that quote in front, as it was left
  const [kept] = useState(() => {
    const index = isReturning() ? quotes.findIndex(({ id }) => id === recall<string>("fan")) : -1;
    return index < 0 ? null : index;
  });
  const [active, setActive] = useState(kept ?? 0);
  const [open, setOpen] = useState(kept !== null);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(true);
  const count = quotes.length;
  const front = quotes[active]?.id;
  useEffect(() => {
    if (front) remember("fan", front);
  }, [front]);

  // Spreads from a closed stack the first time it scrolls into view. Measured on the page's own scroll rather than
  // with an IntersectionObserver, which inside the clipped home page sometimes never reported it; once a frame, when
  // the frame lays the page out anyway, and the spread is rendered without holding up the scroll
  useEffect(() => {
    const root = section.current;
    const scroller = document.getElementById("app-scroll");
    if (!root) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      if (box.top > innerHeight * 0.75 || box.bottom < innerHeight * 0.25) return;
      startTransition(() => setOpen(true));
      scroller?.removeEventListener("scroll", follow);
    };
    const follow = () => {
      frame ||= requestAnimationFrame(check);
    };
    check();
    scroller?.addEventListener("scroll", follow, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller?.removeEventListener("scroll", follow);
    };
  }, []);

  // Reduced motion never starts the swap on its own
  useEffect(() => {
    if (prefersReduced()) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!open || !playing || hovering || count < 2) return;
    const timer = setInterval(() => setActive((index) => (index + 1) % count), SWAP_MS);
    return () => clearInterval(timer);
  }, [count, hovering, open, playing]);

  if (count === 0) return null;

  const step = (by: number) => setActive((index) => (index + by + count) % count);
  const offsetOf = (index: number) => wrap(index - active, count);

  const cards = () => [...(fan.current?.querySelectorAll<HTMLElement>(".fan-card") ?? [])];

  // Cards behind the front one are inert, so pointer events land on the fan: find the topmost card under the point
  const cardAt = (x: number, y: number) => {
    const hit = cards()
      .map((card, index) => ({ index, box: card.getBoundingClientRect(), depth: Number(card.style.zIndex) }))
      .filter(({ box }) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
      .sort((a, b) => b.depth - a.depth)[0];
    return hit ? hit.index : null;
  };

  // The light stays where it last fell (--gx, --gy) while it fades
  const untilt = () => {
    const face = tilted.current;
    if (face) {
      delete face.dataset.tilt;
      face.style.removeProperty("--rx");
      face.style.removeProperty("--ry");
    }
    tilted.current = null;
  };
  // The card under the mouse sinks on the side the pointer is on (Tilt Card), and the light falls where it is
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || prefersReduced()) return;
    const index = cardAt(event.clientX, event.clientY);
    const face = index === null ? null : (cards()[index]?.querySelector<HTMLElement>(".fan-face") ?? null);
    if (face !== tilted.current) untilt();
    if (!face) return;
    const box = face.getBoundingClientRect();
    const nx = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1);
    const ny = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1);
    face.style.setProperty("--rx", `${-ny * TILT}deg`);
    face.style.setProperty("--ry", `${nx * TILT}deg`);
    face.style.setProperty("--gx", `${((nx + 1) / 2) * 100}%`);
    face.style.setProperty("--gy", `${((ny + 1) / 2) * 100}%`);
    face.dataset.tilt = "true";
    tilted.current = face;
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    swiped.current = false;
    if (event.button !== 0 || !open) return;
    const index = cardAt(event.clientX, event.clientY);
    if (index === null) return;
    drag.current = {
      id: event.pointerId,
      index,
      x: event.clientX,
      y: event.clientY,
      on: false,
      touch: event.pointerType !== "mouse",
      dx: 0,
      dy: 0,
      lastX: event.clientX,
      at: event.timeStamp,
      speed: 0,
    };
  };

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.id !== event.pointerId) {
      tilt(event);
      return;
    }
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    const card = cards()[held.index];
    if (!card) return;
    if (!held.on) {
      if (Math.hypot(dx, dy) < DRAG_PX) return;
      // A finger moving mostly up or down is scrolling the page, not carrying a card
      if (held.touch && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      held.on = true;
      untilt();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
      card.dataset.held = "true";
    }
    const elapsed = event.timeStamp - held.at;
    if (elapsed > 0) held.speed = Math.abs(event.clientX - held.lastX) / elapsed;
    held.lastX = event.clientX;
    held.at = event.timeStamp;
    held.dx = dx;
    held.dy = dy;
    card.style.setProperty("--drag-x", `${dx}px`);
    card.style.setProperty("--drag-y", `${dy}px`);
    // It leans the way it is carried, like a card held by its top edge
    card.style.setProperty("--drag-r", `${clamp(dx * 0.03, -9, 9)}deg`);
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    drag.current = null;
    if (!held?.on) return;
    swiped.current = true;
    delete event.currentTarget.dataset.dragging;
    const card = cards()[held.index];
    if (card) {
      delete card.dataset.held;
      for (const name of ["--drag-x", "--drag-y", "--drag-r"]) card.style.removeProperty(name);
    }
    const thrown = Math.hypot(held.dx, held.dy) > THROW_PX || held.speed > FLING;
    // The card that was carried comes to the front; the front card thrown away goes to the back and its neighbour on
    // the side it left from steps forward. Either way it springs from where the pointer let it go.
    setActive(held.index === active && thrown ? (active + (held.dx < 0 ? 1 : -1) + count) % count : held.index);
  };

  const pick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-front='true']")) return;
    const index = cardAt(event.clientX, event.clientY);
    if (index !== null) setActive(index);
  };

  return (
    <section
      ref={section}
      className="latest"
      aria-labelledby="latest-title"
      aria-roledescription="輪播"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div className="latest-head">
        <h2 id="latest-title" className="section-title">
          最新說說
        </h2>
        <div className="latest-controls">
          <Button isIconOnly radius="full" variant="bordered" data-magnet aria-label={playing ? "暫停輪播" : "繼續輪播"} onPress={() => setPlaying((value) => !value)}>
            <span className="icon-swap" data-swapped={!playing} aria-hidden="true">
              <Pause size={18} />
              <Play size={18} />
            </span>
          </Button>
          <Button isIconOnly radius="full" variant="bordered" data-magnet aria-label="上一張" onPress={() => step(-1)}>
            <ChevronLeft aria-hidden="true" size={20} />
          </Button>
          <Button isIconOnly radius="full" variant="bordered" data-magnet aria-label="下一張" onPress={() => step(1)}>
            <ChevronRight aria-hidden="true" size={20} />
          </Button>
        </div>
      </div>

      <div
        ref={fan}
        className="fan"
        data-open={open}
        onPointerDown={press}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={untilt}
        onClickCapture={(event) => {
          // A drag that ends on the front card must not open it
          if (!swiped.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={pick}
      >
        {quotes.map((quote, index) => {
          const offset = offsetOf(index);
          const front = offset === 0;
          // Until it scrolls into view the hand is one closed stack in the middle; then it fans out from there
          const place = open ? offset : 0;
          const style = {
            "--k": place,
            "--abs": Math.abs(place),
            // How far into the ground the card has sunk: it changes only for the cards that leave or take the front
            "--veil": Math.min(Math.abs(offset), 1),
            "--glow": `var(--stock-${quote.category.key})`,
            zIndex: (count - Math.abs(offset)) * 10,
          } as CSSProperties;
          return (
            <article
              key={quote.id}
              className="fan-card"
              data-front={front}
              style={style}
              aria-roledescription="說說卡片"
              aria-label={`第 ${index + 1} 句，共 ${count} 句`}
              inert={!front}
            >
              {/* The card places itself in the hand; its face tilts under the mouse on its own timing. The face is the
                  one a card on 說說 has: the sentence on a dotted stage, the facts on a bar beneath */}
              <div className="fan-face">
                <div className="bench-stage" data-size={stageSize(Array.from(quote.content).length)}>
                  <div className="bench-top">
                    <CategoryChip category={quote.category.key} />
                    <cite className="bench-source">{quote.source_from}</cite>
                  </div>
                  <p className="quote fan-quote" data-quote-text>
                    {quote.content}
                  </p>
                </div>
                <footer className="bench-bar">
                  <QuoteCredit quote={quote} avatar dated />
                  <Link className="fan-open" href={`/q/${quote.id}`} data-quote-id={quote.id} draggable={false}>
                    讀這句
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                </footer>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fan-dots">
        {quotes.map((quote, index) => (
          <button
            key={quote.id}
            type="button"
            className="fan-dot"
            aria-label={`第 ${index + 1} 句`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => setActive(index)}
          />
        ))}
      </div>

      <p className="latest-more">
        <LinkButton href="/quotes" radius="full" variant="light" data-magnet endContent={<ArrowRight aria-hidden="true" size={18} />}>
          瀏覽全部說說
        </LinkButton>
      </p>
    </section>
  );
}
