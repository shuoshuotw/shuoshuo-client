"use client";

import { useEffect, useRef, useState } from "react";
import { MorphDialog } from "@/components/morph-dialog";
import { QuoteSheet, SheetBlank } from "@/components/quote-sheet";
import { QuoteRow, QuoteRowSkeleton } from "@/components/quote-row";
import { SuccessCheck } from "@/components/success-check";
import type { Quote } from "@/lib/api/client";
import { staggerRows } from "@/motion/anime";

const sample = (content: string, key: string, name: string, index: number): Quote =>
  ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    content,
    length: Array.from(content).length,
    category: { key, name },
    source_from: "元件測試",
    submitter: { id: "x", username: "小明", deleted: false },
    stats: { like_count: index, favorite_count: 0, comment_count: 0 },
    status: "published",
    commit_from: "web",
    edited_at: null,
    created_at: "2026-11-01T00:00:00.000Z",
  }) as Quote;

const ROWS = [sample("行到水窮處，坐看雲起時。", "poetry", "詩詞", 1), sample("前進吧，不要停下來。", "game", "遊戲", 2)];

export function DevComponents() {
  const list = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (list.current) void staggerRows([...list.current.children]);
  }, []);

  return (
    <main className="dev-page">
      <h1 className="section-title">元件狀態</h1>

      <h2>QuoteSheet</h2>
      <div className="dev-grid">
        <div data-testid="state-loading">
          <SheetBlank />
        </div>
        <div data-testid="state-empty">
          <SheetBlank>
            <p className="sheet-note">這個字盤是空的</p>
          </SheetBlank>
        </div>
        <div data-testid="state-error">
          <SheetBlank>
            <p className="sheet-note">說說沒有載入成功</p>
          </SheetBlank>
        </div>
        <div data-testid="state-loaded">
          <QuoteSheet quote={ROWS[0]!} />
        </div>
      </div>

      <h2>QuoteRow</h2>
      <div ref={list} className="dev-rows" data-testid="rows">
        {ROWS.map((quote) => (
          <QuoteRow key={quote.id} quote={quote} />
        ))}
      </div>
      <div data-testid="row-skeleton">
        <QuoteRowSkeleton />
      </div>

      <h2>對話框</h2>
      <MorphDialog label="開啟對話框" title="提交這句說說">
        <p>對話框由按鈕的位置展開。</p>
      </MorphDialog>

      <h2>表單與成功</h2>
      <label className={`dev-field ${shaking ? "field-shake" : ""}`} onAnimationEnd={() => setShaking(false)}>
        說說內容
        <input className="dev-input" aria-invalid={shaking} />
      </label>
      <button type="button" className="button" onClick={() => setShaking(true)}>
        送出錯誤
      </button>
      <button type="button" className="button" onClick={() => setChecked(true)}>
        送出成功
      </button>
      {checked && <SuccessCheck />}
    </main>
  );
}
