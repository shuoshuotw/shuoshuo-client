"use client";

import { Bookmark, Check, ChevronLeft, Columns2, Copy, Heart, Rows2, SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/api/client";
import { isSignedIn, sendReaction } from "@/lib/api/reactions";
import { burstLike, pressFavorite } from "@/motion/anime";
import { dropType, flipLayout, pickType } from "@/motion/gsap";
import { useQuoteStageStore } from "@/stores/quote-stage";
import { type ReactionKind, useReactionStore } from "@/stores/reactions";
import { useUiStore } from "@/stores/ui";
import { QuoteSheet, SheetBlank } from "./quote-sheet";
import { TypeCase } from "./type-case";

const CaseDrawer = dynamic(() => import("./case-drawer").then((module) => module.CaseDrawer), { ssr: false });

async function toast(title: string) {
  const { addToast } = await import("@heroui/toast");
  addToast({ title });
}

// Vertical setting only holds short quotes on a phone without sideways scrolling (§12.8)
const fitsVertical = (quote: Quote | null) => !quote || quote.length <= 40 || window.innerWidth >= 640;

export function QuoteStage({ initial }: { initial: Quote | null }) {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const restore = useRef<() => void>(() => {});
  const picked = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = useQuoteStageStore((state) => state.current) ?? initial;
  const status = useQuoteStageStore((state) => state.status);
  const historySize = useQuoteStageStore((state) => state.history.length);
  const categories = useQuoteStageStore((state) => state.categories);
  const { next, back, toggleCategory, clearCategories, settle, hydrate, restoreFilter } = useQuoteStageStore.getState();
  const layout = useUiStore((state) => state.layout);
  const reaction = useReactionStore((state) => (current ? state.byQuote[current.id] : undefined));

  useEffect(() => {
    hydrate(initial);
    restoreFilter();
    // The cached page was built while Core was down: fetch the first quote here instead
    if (!initial) void useQuoteStageStore.getState().next();
    return useUiStore.getState().connect();
  }, [hydrate, initial, restoreFilter]);

  useEffect(() => {
    if (current) useReactionStore.getState().seed(current.id, { like_count: current.stats.like_count, favorite_count: current.stats.favorite_count });
  }, [current]);

  // M-01 on arrival, once the face is in or 800 ms have passed
  useEffect(() => {
    const root = stage.current;
    if (picked.current || !root) return;
    picked.current = true;
    const show = () => document.documentElement.classList.remove("pick-pending");
    void Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))])
      .then(async () => {
        const run = pickType(root);
        // pickType has set the from-state by the time gsap is in, so lifting the mask does not flash
        requestAnimationFrame(show);
        await run;
      })
      .catch(show);
  }, []);

  // M-01 for every later quote
  useEffect(() => {
    const root = stage.current;
    if (status !== "animating" || !root) return;
    restore.current();
    restore.current = () => {};
    void pickType(root).catch(() => {}).finally(settle);
  }, [current?.id, settle, status]);

  const draw = () => {
    const root = stage.current;
    if (root) {
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

  const choose = (key: string) => {
    toggleCategory(key);
    draw();
  };
  const clear = () => {
    clearCategories();
    draw();
  };

  const switchLayout = () => {
    const root = stage.current;
    const wanted = layout === "horizontal" ? "vertical" : "horizontal";
    if (wanted === "vertical" && !fitsVertical(current)) {
      void toast("這句說說太長，手機上無法直排");
      return;
    }
    if (root) void flipLayout(root, () => useUiStore.getState().setLayout(wanted));
  };

  const react = async (kind: ReactionKind, button: HTMLButtonElement) => {
    if (!current) return;
    if (!(await isSignedIn())) {
      router.push("/login?next=/");
      return;
    }
    const icon = button.querySelector("svg");
    const active = kind === "like" ? reaction?.liked : reaction?.favorited;
    if (icon && !active) void (kind === "like" ? burstLike(button, icon) : pressFavorite(icon));
    useReactionStore.getState().toggle(current.id, kind, sendReaction, () => void toast("操作沒有成功，請再試一次"));
  };

  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(`${current.content}\n——${current.source_from}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const quiet = status === "empty" || status === "error" || !current;

  return (
    <div className="stage">
      <aside className="stage-case">
        <TypeCase selected={categories} onToggle={choose} onClear={clear} />
      </aside>

      <div className="stage-paper" ref={stage} aria-live="polite" aria-busy={status === "loading"}>
        {status === "empty" ? (
          <SheetBlank>
            <p className="sheet-note">這個字盤是空的</p>
            <button type="button" className="button" onClick={clear}>
              清除篩選
            </button>
          </SheetBlank>
        ) : !current && status === "loading" ? (
          <SheetBlank />
        ) : status === "error" || !current ? (
          <SheetBlank>
            <p className="sheet-note">說說沒有載入成功</p>
            <button type="button" className="button" onClick={draw}>
              重試
            </button>
          </SheetBlank>
        ) : (
          <QuoteSheet quote={current} layout={layout} />
        )}
      </div>

      <div className="action-bar">
        {/* Never disabled: that would throw keyboard focus away on every draw */}
        <button type="button" className="button button-primary" onClick={draw}>
          再抽一句
        </button>
        <button type="button" className="tool" aria-label="上一句" disabled={historySize === 0} onClick={back}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <button type="button" className="tool tool-case" aria-label="開啟類別字盤" onClick={() => setDrawerOpen(true)}>
          <SlidersHorizontal aria-hidden="true" />
        </button>
        <span className="action-gap" />
        <button
          type="button"
          className="tool tool-count"
          aria-label={layout === "horizontal" ? "改為直排" : "改為橫排"}
          data-testid="layout-toggle"
          onClick={switchLayout}
        >
          {layout === "horizontal" ? <Columns2 aria-hidden="true" /> : <Rows2 aria-hidden="true" />}
          <span className="tool-label">{layout === "horizontal" ? "直排" : "橫排"}</span>
        </button>
        <button
          type="button"
          className="tool tool-count"
          data-active={reaction?.liked ?? false}
          aria-pressed={reaction?.liked ?? false}
          aria-label={`按讚，目前 ${reaction?.like_count ?? 0} 個`}
          disabled={quiet}
          onClick={(event) => void react("like", event.currentTarget)}
        >
          <Heart aria-hidden="true" />
          <span className="count" key={reaction?.like_count}>
            {reaction?.like_count ?? 0}
          </span>
        </button>
        <button
          type="button"
          className="tool tool-count"
          data-active={reaction?.favorited ?? false}
          aria-pressed={reaction?.favorited ?? false}
          aria-label={`收藏，目前 ${reaction?.favorite_count ?? 0} 個`}
          disabled={quiet}
          onClick={(event) => void react("favorite", event.currentTarget)}
        >
          <Bookmark aria-hidden="true" />
          <span className="count" key={reaction?.favorite_count}>
            {reaction?.favorite_count ?? 0}
          </span>
        </button>
        <button type="button" className="tool tool-count" aria-label={copied ? "已複製" : "複製這句"} disabled={quiet} onClick={() => void copy()}>
          <span className="swap" data-swapped={copied} aria-hidden="true">
            <Copy />
            <Check />
          </span>
          <span className="tool-label">{copied ? "已複製" : "複製"}</span>
        </button>
        {current && !quiet && (
          <Link className="text-link action-detail" href={`/q/${current.id}`}>
            留言與詳情
          </Link>
        )}
      </div>

      {drawerOpen && <CaseDrawer selected={categories} onToggle={choose} onClear={clear} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
