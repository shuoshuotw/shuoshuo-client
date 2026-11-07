"use client";

import { Button } from "@heroui/react";
import { Check, Copy, PenLine, RotateCw, Shuffle } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Quote } from "@/lib/api/client";
import { bracketCorners, dropType, moveBrackets, pickType, preloadPick } from "@/motion/gsap";
import { useQuoteStageStore } from "@/stores/quote-stage";
import { CommentsButton } from "./comments-dialog";
import { useDockSlot } from "./dock-slot";
import { LinkButton } from "./link-button";
import { Bracket } from "./logo";
import { QuoteCredit, QuoteType } from "./quote-sheet";
import { Reveal } from "./reveal";
import { ReactionButtons, useQuoteReactions } from "./reaction-buttons";

function StageNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="stage-note" data-testid="sheet-blank">
      <p className="stage-note-title">{title}</p>
      {children}
    </div>
  );
}

/** The same box as a quote, so the swap to the real sentence moves nothing (MO-09). */
function StageSkeleton() {
  return (
    <div className="stage-skeleton" data-testid="sheet-blank" aria-hidden="true">
      <span className="skeleton-line" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-short" />
    </div>
  );
}

export function QuoteStage({ initial }: { initial: Quote | null }) {
  const stage = useRef<HTMLDivElement>(null);
  const restore = useRef<() => void>(() => {});
  const picked = useRef(false);
  // Where the brackets stood when the last draw began, and whether they glided to the new sentence
  const corners = useRef<{ x: number; y: number }[] | null>(null);
  const glided = useRef(false);
  const [copied, setCopied] = useState(false);
  const [spins, setSpins] = useState(0);
  const slot = useDockSlot();

  const current = useQuoteStageStore((state) => state.current) ?? initial;
  const status = useQuoteStageStore((state) => state.status);
  const { next, settle, hydrate } = useQuoteStageStore.getState();
  const category = current?.category.key ?? "other";

  useEffect(() => {
    hydrate(initial);
    // The cached page was built while Core was down: fetch the first quote here instead
    if (!initial) void useQuoteStageStore.getState().next();
  }, [hydrate, initial]);

  useQuoteReactions(current);

  // The whole home page takes its light from the quote's category; the cursor's light lives on the body, so the root carries it too
  useEffect(() => {
    for (const element of [stage.current?.closest<HTMLElement>(".home"), document.documentElement]) element?.style.setProperty("--tint", `var(--stock-${category})`);
  }, [category]);

  // Before the new sentence paints, the brackets start from where they held the last one, and the type stays hidden
  // until M-01 has set its starting state
  useLayoutEffect(() => {
    const root = stage.current;
    glided.current = Boolean(root && corners.current && root.querySelector(".bracket"));
    if (root && glided.current && corners.current) {
      root.dataset.hold = "true";
      moveBrackets(root, corners.current);
    }
    corners.current = null;
  }, [current?.id]);

  // M-01 on arrival, once the face is in or 800 ms have passed
  useEffect(() => {
    const root = stage.current;
    if (picked.current || !root) return;
    picked.current = true;
    preloadPick();
    const show = () => document.documentElement.classList.remove("pick-pending");
    void Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))])
      // The mask lifts only once every character holds its starting state, so the sentence never shows whole first
      .then(() => pickType(root, { onReady: show }))
      .catch(show);
  }, []);

  // M-01 for every later quote
  useEffect(() => {
    const root = stage.current;
    if (status !== "animating" || !root) return;
    restore.current();
    restore.current = () => {};
    const release = () => delete root.dataset.hold;
    void pickType(root, { brackets: !glided.current, onReady: release })
      .catch(release)
      .finally(settle);
  }, [current?.id, settle, status]);

  const draw = () => {
    const root = stage.current;
    setSpins((count) => count + 1);
    if (root) {
      corners.current = root.querySelector(".bracket") ? bracketCorners(root) : null;
      restore.current();
      restore.current = dropType(root);
    }
    void next().finally(() => {
      if (useQuoteStageStore.getState().status !== "animating") {
        restore.current();
        restore.current = () => {};
      }
    });
  };

  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const quiet = status === "empty" || status === "error" || !current;

  const toolbar = (
    <div className="stage-toolbar" role="toolbar" aria-label="這句說說" data-morph-origin>
      {/* Never disabled: that would throw keyboard focus away on every draw. Each press turns the colours further round */}
      <span className="draw-wrap" data-magnet data-flare={spins ? spins % 2 : undefined} style={{ "--spin": `${spins * 200}deg` } as CSSProperties}>
        <Button radius="full" className="toolbar-draw" startContent={<Shuffle aria-hidden="true" size={18} />} onPress={draw}>
          <span className="toolbar-draw-label">換一句</span>
          <span className="draw-sheen" aria-hidden="true" />
        </Button>
      </span>
      <span className="toolbar-gap" aria-hidden="true" />
      <ReactionButtons quote={current} disabled={quiet} />
      <Button
        isIconOnly
        radius="full"
        variant="light"
        className="tool-copy"
        data-copied={copied}
        data-magnet
        aria-label={copied ? "已複製" : "複製這句"}
        isDisabled={quiet}
        onPress={() => void copy()}
      >
        <span className="copy-swap" aria-hidden="true">
          <Copy size={18} />
          <Check size={18} />
        </span>
      </Button>
      {/* The comments open over the stage, grown out of the whole bar (M-04) */}
      {current && !quiet && <CommentsButton key={current.id} quote={current} labelled />}
    </div>
  );

  return (
    <section className="stage" aria-label="隨機一句說說">
      <div className="stage-light" aria-hidden="true" />

      <div className="stage-body" ref={stage} aria-live="polite" aria-busy={status === "loading"}>
        <Reveal loading={!current && status === "loading"} skeleton={<StageSkeleton />}>
          {status === "empty" ? (
            <StageNote title="這裡還沒有任何說說">
              <LinkButton href="/submit" color="primary" radius="full" data-magnet startContent={<PenLine aria-hidden="true" size={18} />}>
                提交第一句
              </LinkButton>
            </StageNote>
          ) : status === "error" || !current ? (
            <StageNote title="說說沒有載入成功">
              <Button radius="full" variant="bordered" data-magnet startContent={<RotateCw aria-hidden="true" size={18} />} onPress={draw}>
                重試
              </Button>
            </StageNote>
          ) : (
            // Not keyed by quote: the brackets stay mounted and glide from one sentence to the next
            <figure className="stage-quote">
              <div className="quote-frame">
                <Bracket />
                {/* Keyed, so each sentence's characters (and the caret riding them) are new; the brackets around them stay */}
                <QuoteType key={current.id} content={current.content} />
                <Bracket end />
              </div>
              <figcaption>
                <QuoteCredit quote={current} />
              </figcaption>
            </figure>
          )}
        </Reveal>
      </div>

      {slot ? createPortal(toolbar, slot) : toolbar}
    </section>
  );
}
