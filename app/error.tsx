"use client";

import { CATEGORIES } from "@/lib/categories";

/** §12.7 /500: the same empty cell as the 404. Sentry reporting arrives with M7. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="missing">
      <div className="missing-case" aria-hidden="true">
        {CATEGORIES.map(({ key, name }, index) => (
          <span key={key} className="case-cell" data-gone={index === 3}>
            {index === 3 ? "" : name}
          </span>
        ))}
      </div>
      <div>
        <h1 className="section-title">字盤翻倒了</h1>
        <p>這個頁面暫時排不出來，請再試一次。</p>
        <button type="button" className="button button-primary" onClick={reset}>
          重試
        </button>
      </div>
    </main>
  );
}
