"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Quote } from "@/lib/api/client";
import { foldSpines } from "@/motion/gsap";
import { stockOf } from "./quote-sheet";

const SPINE_WIDTH = 120;

const dateOf = (iso: string) => new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(new Date(iso));

/** Without script, on a phone, or with reduced motion this stays a plain stack. */
export function LatestSpines({ quotes }: { quotes: Quote[] }) {
  const stage = useRef<HTMLElement>(null);
  const deck = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stage.current;
    const cards = deck.current;
    if (!root || !cards || quotes.length < 2) return;
    const wide = matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    if (!wide.matches) return;
    root.dataset.folding = "true";
    let undo = () => {};
    let gone = false;
    void foldSpines(root, cards, SPINE_WIDTH).then((cleanup) => {
      if (gone) cleanup();
      else undo = cleanup;
    });
    return () => {
      gone = true;
      undo();
      delete root.dataset.folding;
    };
  }, [quotes.length]);

  // A card that has folded away can be brought back by clicking its spine
  const bringBack = (index: number) => {
    const root = stage.current;
    if (!root?.dataset.folding) return;
    const span = root.offsetHeight - innerHeight;
    scrollTo({ top: root.offsetTop + (index / (quotes.length - 1)) * span, behavior: "smooth" });
  };

  if (quotes.length === 0) return null;

  return (
    <section className="spines" ref={stage} aria-labelledby="latest-title">
      <div className="spines-stage">
        <h2 id="latest-title" className="section-title">
          最新說說
        </h2>
        <div className="spines-deck" ref={deck}>
          {quotes.map((quote, index) => (
            <article
              key={quote.id}
              className="spine-card"
              data-spine-card
              style={{ ...stockOf(quote.category.key), zIndex: index + 1 }}
              onClick={() => bringBack(index)}
            >
              <p className="quote quote-row">{quote.content}</p>
              <footer className="spine-meta">
                <span>
                  {quote.source_from}・{dateOf(quote.created_at)}
                </span>
                <Link className="text-link" href={`/q/${quote.id}`}>
                  讀這句
                </Link>
              </footer>
            </article>
          ))}
        </div>
        <p className="spines-more">
          <Link className="text-link" href="/quotes">
            瀏覽全部說說
          </Link>
        </p>
      </div>
    </section>
  );
}
